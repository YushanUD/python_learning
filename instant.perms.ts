import type { InstantRules } from "@instantdb/react";
import schema from "./instant.schema";

const rules: InstantRules<typeof schema> = {
  $default: {
    allow: {
      $default: "false",
    },
  },
  users: {
    allow: {
      create: "true",
      view: "auth.role == 'admin' || auth.id == data.id",
      update: "auth.role == 'admin' || auth.id == data.id",
      delete: "auth.role == 'admin'",
    },
    fields: {
      nickname: "true",
      name: "auth.role == 'admin' || auth.id == data.id",
      studentId: "auth.role == 'admin' || auth.id == data.id",
      email: "auth.role == 'admin' || auth.id == data.id",
      passwordHash: "auth.role == 'admin' || auth.id == data.id",
      role: "auth.role == 'admin'",
      createdAt: "auth.role == 'admin' || auth.id == data.id",
    },
  },
  materials: {
    allow: {
      view: "true",
      create: "auth.role == 'admin'",
      update: "auth.role == 'admin'",
      delete: "auth.role == 'admin'",
    },
  },
  exercises: {
    allow: {
      view: "true",
      create: "auth.role == 'admin'",
      update: "auth.role == 'admin'",
      delete: "auth.role == 'admin'",
    },
  },
  submissions: {
    allow: {
      view: "auth.role == 'admin' || auth.id == data.userId",
      create: "auth.id == data.userId",
      update: "auth.id == data.userId",
      delete: "auth.role == 'admin'",
    },
  },
  scoreSummaries: {
    allow: {
      view: "true",
      create: "auth.role == 'admin' || auth.id == data.userId",
      update: "auth.role == 'admin' || auth.id == data.userId",
      delete: "auth.role == 'admin'",
    },
  },
};

export default rules;
