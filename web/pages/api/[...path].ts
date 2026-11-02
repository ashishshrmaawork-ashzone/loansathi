import type { NextApiRequest, NextApiResponse } from "next";
import app, { initializeApp } from "@/server/app.js";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function apiHandler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  try {
    await initializeApp();
    return await new Promise<void>((resolve, reject) => {
      const finish = () => resolve();
      response.once("finish", finish);
      response.once("close", finish);
      app(request, response, (error?: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch (error) {
    console.error("API request failed:", error);
    if (!response.headersSent) {
      return response.status(503).json({
        message:
          "The API could not connect to MongoDB. Check the Vercel MONGO_URI and SESSION_SECRET environment variables.",
      });
    }
    return response.end();
  }
}
