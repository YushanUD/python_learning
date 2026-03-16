import { init } from "@instantdb/react";
import schema from "../../instant.schema";

const APP_ID = "c8b683ed-953d-491e-8e0b-00c9e5051cf7";

export const db = init({
  appId: APP_ID,
  schema,
});

export type SeedMaterial = {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
};

export type SeedExercise = {
  id: string;
  materialId: string;
  prompt: string;
  starterCode: string;
  expectedOutput: string;
  testCasesJson: string;
  orderIndex: number;
};

export const seedMaterials: SeedMaterial[] = [
  {
    id: "material-python-basics",
    title: "Python Basics",
    content:
      "Learn variables, print statements, and simple expressions. Python focuses on readability and fast iteration for beginners.",
    orderIndex: 1,
  },
  {
    id: "material-control-flow",
    title: "Control Flow",
    content:
      "Use if/else branches and loops to control program behavior. Understanding flow is key to solving real programming problems.",
    orderIndex: 2,
  },
];

export const seedExercises: SeedExercise[] = [
  {
    id: "exercise-hello-python",
    materialId: "material-python-basics",
    prompt: "Print exactly: Hello, Python",
    starterCode: "print('')",
    expectedOutput: "Hello, Python",
    testCasesJson: JSON.stringify([
      {
        name: "Contains print statement",
        requiredPatterns: ["print("],
      },
      {
        name: "Outputs greeting",
        requiredPatterns: ["Hello, Python"],
      },
    ]),
    orderIndex: 1,
  },
  {
    id: "exercise-even-check",
    materialId: "material-control-flow",
    prompt:
      "Write code that sets n = 4 and prints 'even' when n is even, otherwise prints 'odd'.",
    starterCode: "n = 4\nif n % 2 == 0:\n    print('even')\nelse:\n    print('odd')",
    expectedOutput: "even",
    testCasesJson: JSON.stringify([
      {
        name: "Uses if statement",
        requiredPatterns: ["if", "==", "%"],
      },
      {
        name: "Has even output",
        requiredPatterns: ["even"],
      },
    ]),
    orderIndex: 2,
  },
];

type DataRow = { id: string };

export async function ensureSeedData(params: {
  materials: DataRow[];
  exercises: DataRow[];
}) {
  const { materials, exercises } = params;

  const materialIds = new Set(materials.map((item) => item.id));
  const exerciseIds = new Set(exercises.map((item) => item.id));

  const txChunks: unknown[] = [];

  for (const material of seedMaterials) {
    if (!materialIds.has(material.id)) {
      txChunks.push(
        db.tx.materials[material.id].update({
          title: material.title,
          content: material.content,
          orderIndex: material.orderIndex,
          createdAt: new Date(),
        }),
      );
    }
  }

  for (const exercise of seedExercises) {
    if (!exerciseIds.has(exercise.id)) {
      txChunks.push(
        db.tx.exercises[exercise.id]
          .update({
            materialId: exercise.materialId,
            prompt: exercise.prompt,
            starterCode: exercise.starterCode,
            expectedOutput: exercise.expectedOutput,
            testCasesJson: exercise.testCasesJson,
            orderIndex: exercise.orderIndex,
          })
          .link({ material: exercise.materialId }),
      );
    }
  }

  if (txChunks.length > 0) {
    await db.transact(txChunks as never[]);
  }
}
