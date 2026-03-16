import { i } from "@instantdb/react";

const schema = i.schema({
  entities: {
    users: i.entity({
      name: i.string(),
      studentId: i.string(),
      email: i.string(),
      nickname: i.string(),
      passwordHash: i.string(),
      role: i.string<"student" | "admin">(),
      createdAt: i.date(),
    }),
    materials: i.entity({
      title: i.string(),
      content: i.string(),
      orderIndex: i.number(),
      createdAt: i.date(),
    }),
    exercises: i.entity({
      materialId: i.string(),
      prompt: i.string(),
      starterCode: i.string(),
      expectedOutput: i.string(),
      testCasesJson: i.string(),
      orderIndex: i.number(),
    }),
    submissions: i.entity({
      userId: i.string(),
      exerciseId: i.string(),
      code: i.string(),
      feedback: i.string(),
      score: i.number(),
      submittedAt: i.date(),
    }),
    scoreSummaries: i.entity({
      userId: i.string(),
      averageScore: i.number(),
      totalExercises: i.number(),
      lastSubmittedAt: i.date(),
    }),
  },
  links: {
    usersSubmissions: {
      forward: { on: "users", has: "many", label: "submissions" },
      reverse: { on: "submissions", has: "one", label: "user" },
    },
    exercisesSubmissions: {
      forward: { on: "exercises", has: "many", label: "submissions" },
      reverse: { on: "submissions", has: "one", label: "exercise" },
    },
    materialsExercises: {
      forward: { on: "materials", has: "many", label: "exercises" },
      reverse: { on: "exercises", has: "one", label: "material" },
    },
    usersScoreSummary: {
      forward: { on: "users", has: "one", label: "scoreSummary" },
      reverse: { on: "scoreSummaries", has: "one", label: "user" },
    },
  },
});

export default schema;
