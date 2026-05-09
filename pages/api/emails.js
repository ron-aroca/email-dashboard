// pages/api/emails.js
// This endpoint fetches real emails from your Outlook inbox

import { getSession } from "next-auth/react";

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Fetch emails from Microsoft Graph API
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime desc&$filter=isRead eq false OR receivedDateTime gt " +
        new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch emails from Outlook");
    }

    const data = await response.json();
    const emails = data.value || [];

    // Process emails
    const processedEmails = emails.map((email) => {
      const from = email.from?.emailAddress || {
        name: "Unknown",
        address: "unknown@example.com",
      };
      const subject = email.subject || "(No subject)";
      const receivedTime = new Date(email.receivedDateTime);
      const bodyPreview = email.bodyPreview || "";

      // Detect urgency
      let urgency = "normal";
      const textToAnalyze = (subject + " " + bodyPreview).toLowerCase();

      if (
        [
          "critical",
          "urgent",
          "emergency",
          "down",
          "broken",
          "asap",
          "immediately",
          "ceo",
        ].some((kw) => textToAnalyze.includes(kw))
      ) {
        urgency = "critical";
      } else if (
        [
          "important",
          "help",
          "issue",
          "problem",
          "bug",
          "error",
        ].some((kw) => textToAnalyze.includes(kw))
      ) {
        urgency = "high";
      }

      // Detect email type
      const isInternal = from.address.includes("@planitroi.com");
      const emailType = isInternal ? "internal" : "client";

      return {
        id: email.id,
        from: from,
        subject: subject,
        receivedTime: receivedTime,
        summary: bodyPreview.substring(0, 120) + "...",
        urgency: urgency,
        type: emailType,
        isRead: email.isRead,
        categories: email.categories || [],
      };
    });

    res.status(200).json({ emails: processedEmails });
  } catch (error) {
    console.error("Error fetching emails:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch emails: " + error.message });
  }
}
