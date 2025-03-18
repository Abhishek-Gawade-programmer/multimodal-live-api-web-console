import {
  type FunctionDeclaration,
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;

async function getHelpFromAdobePremierePro(prompt: string) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const LIST_OF_URLS = [
    "https://helpx.adobe.com/in/premiere-pro/using/import-media.html",
    "https://helpx.adobe.com/in/premiere-pro/using/open-projects.html",
    "https://helpx.adobe.com/in/premiere-pro/using/move-delete-projects.html",
    "https://helpx.adobe.com/in/premiere-pro/using/multiple-open-projects.html",
    "https://helpx.adobe.com/in/premiere-pro/using/project-shortcuts.html",
    "https://helpx.adobe.com/in/premiere-pro/using/backward-compatibility.html",
    "https://helpx.adobe.com/in/premiere-pro/using/edit-premiere-rush-projects-in-premiere-pro.html",
    "https://helpx.adobe.com/in/premiere-pro/using/bestpractices-projects.html",
  ];

  const docDataList = await Promise.all(
    LIST_OF_URLS.map(async (url) => {
      const response = await fetch(url, {
        mode: "no-cors",
      });
      let text = await response.text();
      text = text.replace(/<[^>]*>?/g, "");
      console.log(`text`, text);
      return text;
    })
  );

  const result = await model.generateContent([
    ...docDataList.map((linkContent) => ({
      inlineData: {
        data: linkContent,
        mimeType: "text/html",
      },
    })),
    prompt,
  ]);

  return result.response.text();
}

const GetHelpFromAdobePremiereProDeclaration: FunctionDeclaration = {
  name: "getHelpFromAdobePremierePro",
  description: "Get  help from Adobe Premiere Pro official documentation",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      prompt: {
        type: SchemaType.STRING,
        description:
          "Prompt to get help from Adobe Premiere Pro official documentation as per user request",
      },
    },
    required: ["prompt"],
  },
};

const functions = {
  getHelpFromAdobePremierePro: async ({ prompt }: { prompt: string }) => {
    return getHelpFromAdobePremierePro(prompt);
  },
};

function AltairComponent() {
  const [adobePremiereProHelpPrompt, setAdobePremiereProHelpPrompt] =
    useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: "You are an expert Adobe Premiere Pro teacher with deep knowledge of video editing workflows. Your role is to act as a helpful assistant, guiding me through Premiere Pro like a real-time tutor. You will help me understand the UI, tools, shortcuts, and best practices. If I get stuck on an editing task, you will provide step-by-step instructions, troubleshooting tips, and efficient workflows. Your explanations should be clear, concise, and practical, with a focus on improving my editing speed and quality. Give only one best option to user based on given prompt. Whenever necessary, use real-world examples and industry-standard techniques to enhance learning. use Adobe Premiere Pro official documentation",
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === GetHelpFromAdobePremiereProDeclaration.name
      );
      if (fc) {
        // Handle controlLight function call
        const prompt = (fc.args as any).prompt;

        setAdobePremiereProHelpPrompt(prompt);

        // You can add state handling for the light settings here if needed
        // For example:
        // setLightSettings({ brightness: Number(brightness), colorTemperature });
      }

      // send data for the response of your tool call
      if (toolCall.functionCalls.length) {
        for (let index = 0; index < toolCall.functionCalls.length; index++) {
          const functionCall = toolCall.functionCalls[index];
          if (
            functionCall.name === GetHelpFromAdobePremiereProDeclaration.name
          ) {
            console.log(`got function call`, functionCall);
            // Call the actual function implementation
            const apiResponse = getHelpFromAdobePremierePro(
              (functionCall.args as any).prompt
            );

            // Send the response back to the model
            client.sendToolResponse({
              functionResponses: [
                {
                  response: {
                    output: apiResponse,
                  },
                  id: functionCall.id,
                },
              ],
            });
          }
        }
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  return <div>{adobePremiereProHelpPrompt}</div>;
}

export const Altair = memo(AltairComponent);
