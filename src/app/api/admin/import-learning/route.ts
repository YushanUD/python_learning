import { NextResponse } from "next/server";
import mammoth from "mammoth";
import JSZip from "jszip";

type GeneratedExercise = {
  prompt: string;
  starterCode: string;
  expectedOutput: string;
  testCasesJson: string;
  orderIndex: number;
};

function normalizeWhitespace(text: string) {
  return text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripXmlTags(xml: string) {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractDocxText(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeWhitespace(result.value);
}

async function extractPdfText(buffer: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const document = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(text);
  }

  return normalizeWhitespace(pageTexts.join("\n\n"));
}

async function extractPptxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = Object.keys(zip.files)
    .filter((filePath) => /^ppt\/slides\/slide\d+\.xml$/i.test(filePath))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const slideTexts: string[] = [];
  for (const slidePath of slidePaths) {
    const xml = await zip.file(slidePath)?.async("text");
    if (!xml) continue;
    slideTexts.push(stripXmlTags(xml));
  }

  return normalizeWhitespace(slideTexts.join("\n\n"));
}

function generateExercises(sourceText: string): GeneratedExercise[] {
  const lines = sourceText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const keywords = ["print", "if", "for", "while", "list", "dict", "function"];
  const foundKeyword =
    keywords.find((keyword) =>
      sourceText.toLowerCase().includes(keyword.toLowerCase()),
    ) ?? "print";

  const topLine = lines[0] ?? "Python fundamentals";
  const secondLine = lines[1] ?? "control flow";

  const templates: GeneratedExercise[] = [
    {
      prompt: `Write a short Python script that demonstrates the concept: ${topLine}`,
      starterCode: "print('')",
      expectedOutput: "A clear output related to the concept",
      testCasesJson: JSON.stringify([
        { name: "Has print statement", requiredPatterns: ["print("] },
      ]),
      orderIndex: 1,
    },
    {
      prompt: `Create a Python example using "${foundKeyword}" related to: ${secondLine}`,
      starterCode:
        foundKeyword === "if"
          ? "value = 10\nif value > 5:\n    print('greater')\nelse:\n    print('smaller')"
          : "for i in range(3):\n    print(i)",
      expectedOutput: "Reasonable output for the selected control structure",
      testCasesJson: JSON.stringify([
        { name: "Contains target keyword", requiredPatterns: [foundKeyword] },
      ]),
      orderIndex: 2,
    },
    {
      prompt:
        "Solve a mini practice task from this material and print a final answer.",
      starterCode: "result = 0\nprint(result)",
      expectedOutput: "Any final computed value",
      testCasesJson: JSON.stringify([
        { name: "Computes a value", requiredPatterns: ["="] },
        { name: "Prints result", requiredPatterns: ["print("] },
      ]),
      orderIndex: 3,
    },
  ];

  return templates;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No file uploaded." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name.toLowerCase();

    let extractedText = "";
    if (filename.endsWith(".pdf")) {
      extractedText = await extractPdfText(buffer);
    } else if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
      extractedText = await extractDocxText(buffer);
    } else if (filename.endsWith(".pptx") || filename.endsWith(".ppt")) {
      extractedText = await extractPptxText(buffer);
    } else {
      return NextResponse.json(
        { message: "Unsupported file format. Use PDF, PPT/PPTX, or DOC/DOCX." },
        { status: 400 },
      );
    }

    if (!extractedText) {
      return NextResponse.json(
        { message: "Could not extract text from this file." },
        { status: 400 },
      );
    }

    const summary = extractedText.slice(0, 8000);
    const exercises = generateExercises(summary);
    return NextResponse.json({
      materialDraft: summary,
      exercisesDraft: exercises,
    });
  } catch {
    return NextResponse.json(
      { message: "Import failed. Please verify the file format and try again." },
      { status: 500 },
    );
  }
}
