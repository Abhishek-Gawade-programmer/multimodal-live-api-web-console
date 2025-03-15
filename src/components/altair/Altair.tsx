/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";

const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

interface LightControlResponse {
  brightness: number;
  colorTemperature: string;
}

const controlLightFunctionDeclaration: FunctionDeclaration = {
  name: "controlLight",
  parameters: {
    type: SchemaType.OBJECT,
    description: "Set the brightness and color temperature of a room light.",
    properties: {
      brightness: {
        type: SchemaType.STRING,
        description:
          "Light level from 0 to 100. Zero is off and 100 is full brightness.",
      },
      colorTemperature: {
        type: SchemaType.STRING,
        description:
          "Color temperature of the light fixture which can be `daylight`, `cool` or `warm`.",
      },
    },
    required: ["brightness", "colorTemperature"],
  },
};

function AltairComponent() {
  const [lightSettings, setLightSettings] = useState<string>("");
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
            text: 'You are my helpful assistant. Any time I ask you for function change in the room brightness or color temperature, call the "controlLight" function I have provided you. Dont ask for additional information just make your best judgement.',
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [controlLightFunctionDeclaration] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === controlLightFunctionDeclaration.name
      );
      if (fc) {
        // Handle controlLight function call
        const brightness = (fc.args as any).brightness;
        const colorTemperature = (fc.args as any).colorTemperature;
        console.log(
          `Setting light: brightness=${brightness}, colorTemperature=${colorTemperature}`
        );
        setLightSettings(
          `brightness: ${brightness}, colorTemperature: ${colorTemperature}`
        );

        // You can add state handling for the light settings here if needed
        // For example:
        // setLightSettings({ brightness: Number(brightness), colorTemperature });
      }

      // send data for the response of your tool call
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls.map((fc) => ({
                response: {
                  output: {
                    success: true,
                    message:
                      fc.name === controlLightFunctionDeclaration.name
                        ? "Light settings updated successfully"
                        : "Operation successful",
                  },
                },
                id: fc.id,
              })),
            }),
          200
        );
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  return <div>{lightSettings}</div>;
}

export const Altair = memo(AltairComponent);
