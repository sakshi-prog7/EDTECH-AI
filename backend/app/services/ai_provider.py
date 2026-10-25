"""AI Provider abstraction — OpenAI + baseline fallback.

Every AI prediction goes through this module. The provider is configured via
the AI_PROVIDER environment variable. When OpenAI is configured but fails,
the system falls back to the baseline models automatically.

Every prediction returns:
    score, confidence, explanation, contributing_factors,
    recommendation, timestamp, model, provider, fallback
"""
from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Optional

from ..core.config import settings

logger = logging.getLogger("ai_provider")


class AIProvider:
    """Base AI provider interface."""

    name: str = "base"

    def lead_score(self, lead_data: dict) -> dict:
        raise NotImplementedError

    def course_recommendation(self, student: dict, courses: list[dict]) -> dict:
        raise NotImplementedError

    def conversion_prediction(self, lead: dict) -> dict:
        raise NotImplementedError

    def dropout_prediction(self, student: dict) -> dict:
        raise NotImplementedError

    def email_generation(self, context: dict) -> dict:
        raise NotImplementedError

    def call_summary(self, transcript: str) -> dict:
        raise NotImplementedError

    def next_best_action(self, context: dict) -> dict:
        raise NotImplementedError


class BaselineProvider(AIProvider):
    """Built-in deterministic baseline — always available, no API key needed."""

    name = "baseline"

    def lead_score(self, lead_data: dict) -> dict:
        from .ai import score_lead_features
        features = {
            "id": lead_data.get("id", ""),
            "platform": lead_data.get("source", ""),
            "region": lead_data.get("course_interest", ""),
            "campaignType": None,
            "leads": lead_data.get("interactions", 0),
            "applications": (
                max(1, round((lead_data.get("interactions", 0) or 0) * 0.4))
                if lead_data.get("status") in ("QUALIFIED", "CONVERTED")
                else 0
            ),
            "enrollments": 1 if lead_data.get("status") == "CONVERTED" else 0,
        }
        result = score_lead_features(features, max(1, lead_data.get("interactions", 1) or 1))
        return {
            "score": result["score"],
            "confidence": result["probability"],
            "explanation": f"Baseline model: {', '.join(result['reasons'][:3])}",
            "contributing_factors": result["reasons"],
            "recommendation": f"Lead is categorized as {result['category']} with {result['risk']} risk.",
            "timestamp": _now_iso(),
            "model": "lead-scoring-baseline-v1",
            "provider": "baseline",
            "fallback": False,
        }

    def course_recommendation(self, student: dict, courses: list[dict] | None = None) -> dict:
        from .ai import recommend_courses
        recs = recommend_courses({"student": student, "topK": 5})
        return {
            "recommendations": recs,
            "confidence": 0.75,
            "explanation": f"Keyword-matched {len(recs)} courses based on student interests.",
            "timestamp": _now_iso(),
            "model": "course-recommendation-keyword-v1",
            "provider": "baseline",
            "fallback": False,
        }

    def conversion_prediction(self, lead: dict) -> dict:
        from .ai import predict_conversion
        result = predict_conversion({"lead": lead})
        return {
            "probability": result["probability"],
            "category": result["category"],
            "factors": result["factors"],
            "explanation": f"Conversion probability: {result['probability']:.1%} ({result['category']} likelihood)",
            "timestamp": _now_iso(),
            "model": "conversion-logistic-v1",
            "provider": "baseline",
            "fallback": False,
        }

    def dropout_prediction(self, student: dict) -> dict:
        from .ai import predict_dropout
        results = predict_dropout({"students": [student]})
        r = results[0] if results else {"probability": 0, "risk": "Low", "reasons": []}
        return {
            "probability": r["probability"],
            "risk": r["risk"],
            "reasons": r["reasons"],
            "explanation": f"Dropout risk: {r['risk']} ({r['probability']:.1%})",
            "timestamp": _now_iso(),
            "model": "dropout-baseline-v1",
            "provider": "baseline",
            "fallback": False,
        }

    def email_generation(self, context: dict) -> dict:
        """Generate a follow-up email using baseline template logic."""
        lead_name = context.get("lead_name", "Student")
        course = context.get("course_interest", "your program")
        tone = context.get("tone", "professional")
        score = context.get("lead_score") or context.get("score")
        priority = context.get("priority", "Medium")
        source = context.get("source", "")
        status = context.get("status", "NEW")
        notes = context.get("notes", "") or ""

        # Build personalized intro based on context
        score_context = ""
        if score is not None:
            try:
                score_val = int(score)
                if score_val >= 75:
                    score_context = " We're excited about your strong interest"
                elif score_val >= 50:
                    score_context = " We appreciate your growing interest"
                else:
                    score_context = " We'd love to learn more about what you're looking for"
            except (ValueError, TypeError):
                pass

        source_context = ""
        if source and source not in ("Website", ""):
            source_context = f" We noticed you found us through {source} — great choice!"

        # Extract signals from notes
        notes_lower = notes.lower()
        notes_signals = ""
        if "weekend" in notes_lower or "flexible" in notes_lower:
            notes_signals = " We also offer flexible scheduling including weekend batches to fit your needs."
        elif "fee" in notes_lower or "cost" in notes_lower or "price" in notes_lower:
            notes_signals = " We understand budget matters — we have flexible payment plans and scholarship options available."
        elif "placement" in notes_lower or "job" in notes_lower or "career" in notes_lower:
            notes_signals = " Our program includes dedicated career placement assistance with a strong track record."
        elif "demo" in notes_lower or "trial" in notes_lower:
            notes_signals = " We'd love to arrange a demo session so you can experience the program firsthand."
        elif "refund" in notes_lower:
            notes_signals = " We offer a transparent refund policy — happy to share the details with you."
        elif "interested" in notes_lower or "details" in notes_lower:
            notes_signals = " We have detailed program information and would be happy to walk you through it."

        # Status-based subject and body
        subject = f"Following up on your {course} interest"
        if status == "NEW":
            subject = f"Welcome! Your {course} learning journey starts here"
        elif status == "CONTACTED":
            subject = f"Thanks for connecting — here's your {course} info"
        elif status in ("INTERESTED", "NURTURING"):
            subject = f"Your personalized {course} roadmap is ready"
        elif status == "DEMO_SCHEDULED":
            subject = f"Demo reminder — {course} program"
        elif status == "QUALIFIED":
            subject = f"Great news — you qualify for {course}!"
        elif status == "APPLICATION":
            subject = f"Application update — {course} program"
        elif status == "INACTIVE":
            subject = f"We miss you, {lead_name}! {course} seats still available"
        elif status == "LOST":
            subject = f"{lead_name}, a special offer for {course}"

        # Build greeting based on score
        if score is not None:
            try:
                score_val = int(score)
                if score_val >= 80:
                    greeting = f"Hi {lead_name}! 🎯"
                elif score_val >= 60:
                    greeting = f"Hi {lead_name}! 👋"
                else:
                    greeting = f"Dear {lead_name},"
            except (ValueError, TypeError):
                greeting = f"Hi {lead_name}! 👋"
        else:
            greeting = f"Hi {lead_name}! 👋"

        # CTA based on status
        if status == "NEW":
            cta = "Would you like to schedule a quick 15-minute call to discuss how this program aligns with your career goals?"
        elif status in ("CONTACTED", "INTERESTED"):
            cta = "I'd love to help you take the next step. Would you prefer a call or a demo session?"
        elif status == "DEMO_SCHEDULED":
            cta = "Just a friendly reminder about your upcoming demo session. Shall I confirm the time?"
        elif status == "QUALIFIED":
            cta = "You qualify for our program! Would you like me to send the application form?"
        elif status == "APPLICATION":
            cta = "Need any help with your application? I'm here to assist you through the process."
        elif status == "ENROLLED":
            cta = "Welcome aboard! Your orientation materials are ready — let me know if you have any questions."
        elif status in ("INACTIVE", "LOST"):
            cta = "We'd love to reconnect. Would you like to schedule a quick chat to discuss your current needs?"
        else:
            cta = "Feel free to reply to this email or call us anytime — we're here to help."

        templates = {
            "professional": f"""<p>{greeting}</p>
<p>Thank you for your interest in our <strong>{course}</strong> program.{score_context}.{source_context}{notes_signals}</p>
<p>{cta}</p>
<p>Our admissions team is available to discuss the curriculum, fee structure, and scholarship opportunities.</p>
<p>Best regards,<br>Admissions Team<br>EDTECH AI</p>""",
            "friendly": f"""<p>{greeting}</p>
<p>Just checking in about the <strong>{course}</strong> program you were interested in.{score_context}.{source_context}{notes_signals}</p>
<p>{cta}</p>
<p>We'd love to help you take the next step! Feel free to reach out anytime.</p>
<p>Cheers,<br>The EDTECH AI Team</p>""",
            "urgent": f"""<p>{greeting}</p>
<p>This is a quick reminder that seats for our <strong>{course}</strong> program are filling up quickly. We'd hate for you to miss out!{notes_signals}</p>
<p>{cta}</p>
<p>Our enrollment window closes soon. Reply to this email or call us to secure your spot.</p>
<p>Best,<br>Admissions Team<br>EDTECH AI</p>""",
        }

        return {
            "subject": subject,
            "body": templates.get(tone, templates["professional"]),
            "tone": tone,
            "explanation": f"Generated {tone}-tone follow-up email for {lead_name}.",
            "timestamp": _now_iso(),
            "model": "email-baseline-v1",
            "provider": "baseline",
            "fallback": False,
        }

    def call_summary(self, transcript: str) -> dict:
        """Basic keyword-extraction summary from a transcript."""
        words = transcript.split()
        word_count = len(words)

        # Simple keyword extraction
        important_words = [
            w.lower() for w in words
            if len(w) > 5 and w.lower() not in {
                "about", "their", "would", "could", "should", "which",
                "there", "these", "those", "other", "being", "after",
                "have", "will", "been", "from", "with", "this", "that",
                "what", "when", "where", "just", "also", "very", "some",
            }
        ]
        # Get top keywords by frequency
        from collections import Counter
        keywords = [w for w, _ in Counter(important_words).most_common(5)]

        # Simple sentiment
        positive_words = {"great", "excellent", "good", "perfect", "love", "wonderful", "amazing", "thanks", "thank"}
        negative_words = {"bad", "poor", "terrible", "hate", "awful", "expensive", "problem", "issue", "wrong", "no", "not"}
        pos = sum(1 for w in words if w.lower() in positive_words)
        neg = sum(1 for w in words if w.lower() in negative_words)
        total = pos + neg
        sentiment = "Neutral"
        sentiment_score = 0.5
        if total > 0:
            sentiment_score = pos / total
            if sentiment_score > 0.6:
                sentiment = "Positive"
            elif sentiment_score < 0.4:
                sentiment = "Negative"

        return {
            "summary": f"Call with {word_count} words. Keywords: {', '.join(keywords[:5])}. Overall sentiment: {sentiment}.",
            "sentiment": sentiment,
            "sentiment_score": round(sentiment_score, 2),
            "keywords": keywords,
            "word_count": word_count,
            "topics": keywords[:3],
            "action_items": ["Follow up with lead", "Send course information"],
            "objections": [],
            "buying_intent": "Medium" if sentiment_score > 0.5 else "Low",
            "next_action": "Schedule a follow-up call to discuss next steps.",
            "timestamp": _now_iso(),
            "model": "call-summary-baseline-v1",
            "provider": "baseline",
            "fallback": False,
        }

    def next_best_action(self, context: dict) -> dict:
        """Determine next best action based on lead context."""
        status = context.get("status", "NEW")
        score = context.get("score", 0) or 0
        engagement = context.get("engagement", 0) or 0
        interactions = context.get("interactions", 0) or 0
        course_interest = context.get("course_interest", "") or ""
        notes = (context.get("notes") or "").lower()

        # Parse notes for signals
        wants_weekend = "weekend" in notes or "flexible" in notes
        concerned_about_fees = "fee" in notes or "cost" in notes or "price" in notes or "scholarship" in notes
        wants_placement = "placement" in notes or "job" in notes or "career" in notes
        demo_done = "demo" in notes and ("done" in notes or "completed" in notes)
        interested = "interested" in notes or "want" in notes

        # Priority: Score + Status logic
        if status == "NEW" and interactions == 0:
            action = "Call within 1 hour — lead just showed interest"
            priority = "High"
        elif status == "CONTACTED" and interactions < 3:
            action = "Follow up with personalized course recommendation"
            priority = "High"
        elif status == "INTERESTED":
            action = f"Send detailed {course_interest} course information and schedule demo"
            priority = "High"
        elif status == "DEMO_SCHEDULED":
            action = "Send demo reminder with preparation details"
            priority = "High"
        elif status == "QUALIFIED":
            action = "Send application form and fee structure"
            priority = "High"
        elif status == "APPLICATION":
            action = "Assist with application completion and follow up"
            priority = "Medium"
        elif status == "NURTURING":
            if concerned_about_fees:
                action = "Share scholarship and payment plan options"
                priority = "High"
            elif interested:
                action = "Schedule course counseling session"
                priority = "Medium"
            else:
                action = "Share success stories and program highlights"
                priority = "Medium"
        elif status == "INACTIVE":
            action = "Send re-engagement email with special offer"
            priority = "Low"
        elif status == "LOST":
            action = "Send win-back email with new offers"
            priority = "Low"
        elif engagement > 70:
            action = "Schedule enrollment counseling session"
            priority = "High"
        elif interactions > 5:
            action = "Escalate to senior counselor for personalized outreach"
            priority = "Medium"
        else:
            action = "Send follow-up email with program highlights"
            priority = "Low"

        # Add note-based refinements
        reasoning_parts = [f"status={status}", f"score={score}", f"engagement={engagement}%", f"interactions={interactions}"]
        if wants_weekend:
            reasoning_parts.append("wants flexible/weekend schedule")
        if concerned_about_fees:
            reasoning_parts.append("concerned about fees/costs")
        if wants_placement:
            reasoning_parts.append("wants placement assistance")
        if demo_done:
            reasoning_parts.append("demo already completed")
        if course_interest:
            reasoning_parts.append(f"interest in {course_interest}")

        return {
            "action": action,
            "priority": priority,
            "reasoning": f"Based on {', '.join(reasoning_parts)}.",
            "explanation": f"Recommended: {action} (Priority: {priority})",
            "timestamp": _now_iso(),
            "model": "next-best-action-v2",
            "provider": "baseline",
            "fallback": False,
        }


class OpenAIProvider(AIProvider):
    """OpenAI-powered provider — requires OPENAI_API_KEY."""

    name = "openai"

    def _call_openai(self, system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str | None:
        """Call OpenAI API. Returns None on failure."""
        api_key = settings.openai_api_key
        if not api_key:
            return None
        model = settings.openai_model or "gpt-3.5-turbo"
        try:
            import urllib.request
            import urllib.error
            payload = json.dumps({
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.3,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["choices"][0]["message"]["content"]
        except Exception as exc:
            logger.warning("[OpenAI] API call failed: %s", exc)
            return None

    def lead_score(self, lead_data: dict) -> dict:
        prompt = f"""Score this lead on a 0-100 scale and explain why:
Name: {lead_data.get('name', 'Unknown')}
Status: {lead_data.get('status', 'NEW')}
Source: {lead_data.get('source', 'Unknown')}
Engagement: {lead_data.get('engagement', 0)}%
Interactions: {lead_data.get('interactions', 0)}
Course Interest: {lead_data.get('course_interest', 'None')}
Priority: {lead_data.get('priority', 'Medium')}

Return JSON: {{"score": <0-100>, "explanation": "<brief explanation>", "category": "High/Medium/Low Intent"}}"""

        result_text = self._call_openai(
            "You are an expert EdTech sales analyst. Score leads based on their profile.",
            prompt,
            max_tokens=200,
        )
        if result_text:
            try:
                parsed = json.loads(result_text)
                return {
                    "score": parsed.get("score", 50),
                    "confidence": 0.85,
                    "explanation": parsed.get("explanation", "AI-generated score"),
                    "contributing_factors": [parsed.get("explanation", "")],
                    "recommendation": f"Lead categorized as {parsed.get('category', 'Medium Intent')}.",
                    "timestamp": _now_iso(),
                    "model": settings.openai_model or "gpt-3.5-turbo",
                    "provider": "openai",
                    "fallback": False,
                }
            except (json.JSONDecodeError, KeyError):
                pass

        # Fallback to baseline
        fallback = BaselineProvider()
        result = fallback.lead_score(lead_data)
        result["fallback"] = True
        return result

    def email_generation(self, context: dict) -> dict:
        lead_name = context.get("lead_name", "Student")
        course = context.get("course_interest", "your program")
        tone = context.get("tone", "professional")

        prompt = f"""Write a {tone} follow-up email for a prospective student named {lead_name} who is interested in {course}.
Include a clear call-to-action. Keep it under 150 words. Return JSON with "subject" and "body" fields."""

        result_text = self._call_openai(
            "You are an expert EdTech admissions email copywriter. Write concise, personalized emails.",
            prompt,
            max_tokens=300,
        )
        if result_text:
            try:
                parsed = json.loads(result_text)
                return {
                    "subject": parsed.get("subject", f"Following up on your {course} interest"),
                    "body": parsed.get("body", ""),
                    "tone": tone,
                    "explanation": f"AI-generated {tone}-tone email for {lead_name}.",
                    "timestamp": _now_iso(),
                    "model": settings.openai_model or "gpt-3.5-turbo",
                    "provider": "openai",
                    "fallback": False,
                }
            except (json.JSONDecodeError, KeyError):
                pass

        fallback = BaselineProvider()
        result = fallback.email_generation(context)
        result["fallback"] = True
        return result

    def call_summary(self, transcript: str) -> dict:
        prompt = f"""Analyze this call transcript and provide:
1. A 2-3 sentence summary
2. Overall sentiment (Positive/Neutral/Negative)
3. Key topics discussed
4. Any objections raised
5. Buying intent level (High/Medium/Low)
6. Recommended next action

Transcript:
{transcript[:3000]}

Return JSON: {{"summary": "...", "sentiment": "...", "topics": [...], "objections": [...], "buying_intent": "...", "next_action": "..."}}"""

        result_text = self._call_openai(
            "You are an expert sales call analyst for an EdTech company.",
            prompt,
            max_tokens=500,
        )
        if result_text:
            try:
                parsed = json.loads(result_text)
                return {
                    **parsed,
                    "timestamp": _now_iso(),
                    "model": settings.openai_model or "gpt-3.5-turbo",
                    "provider": "openai",
                    "fallback": False,
                }
            except (json.JSONDecodeError, KeyError):
                pass

        fallback = BaselineProvider()
        result = fallback.call_summary(transcript)
        result["fallback"] = True
        return result

    def next_best_action(self, context: dict) -> dict:
        prompt = f"""Given this lead context, recommend the single best next action:
Status: {context.get('status', 'NEW')}
Score: {context.get('score', 0)}
Engagement: {context.get('engagement', 0)}%
Interactions: {context.get('interactions', 0)}
Course Interest: {context.get('course_interest', 'None')}

Return JSON: {{"action": "...", "priority": "High/Medium/Low", "reasoning": "..."}}"""

        result_text = self._call_openai(
            "You are an expert EdTech sales strategist. Recommend the best next action.",
            prompt,
            max_tokens=200,
        )
        if result_text:
            try:
                parsed = json.loads(result_text)
                return {
                    **parsed,
                    "explanation": parsed.get("reasoning", ""),
                    "timestamp": _now_iso(),
                    "model": settings.openai_model or "gpt-3.5-turbo",
                    "provider": "openai",
                    "fallback": False,
                }
            except (json.JSONDecodeError, KeyError):
                pass

        fallback = BaselineProvider()
        result = fallback.next_best_action(context)
        result["fallback"] = True
        return result


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def get_provider() -> AIProvider:
    """Get the configured AI provider. Falls back to baseline on error."""
    provider_name = (settings.ai_provider or "baseline").lower()
    if provider_name == "openai" and settings.openai_api_key:
        return OpenAIProvider()
    return BaselineProvider()
