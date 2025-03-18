import { GoogleGenerativeAI } from "@google/generative-ai";


export async function getDocumentSummary(prompt: string,apiKey: string) {

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });

  const pdfResp = await fetch('https://discovery.ucl.ac.uk/id/eprint/10089234/1/343019_3_art_0_py4t4l_convrt.pdf')
      .then((response) => response.arrayBuffer());

  const result = await model.generateContent([
      {
          inlineData: {
              data: Buffer.from(pdfResp).toString("base64"),
              mimeType: "application/pdf",
          },
      },
      prompt,
  ]);
  return result.response.text();
}

// getPDFSummary('https://discovery.ucl.ac.uk/id/eprint/10089234/1/343019_3_art_0_py4t4l_convrt.pdf');