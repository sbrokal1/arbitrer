import { PrismaClient } from "@prisma/client";
import type { Command } from "@prisma/client";
import osc from "osc-js";

export type Trigger = {
  type: "timer";
  interval: number;
};

export type Condition = {
  mod?: number;
} & ({ AND?: Condition } | { OR?: Condition });

export type Arguments = Array<
  { type: "int" | "float"; value: number } | { type: "string"; value: string }
>;

export function commandToOscMessage(command: Command) {
  const args = command.argumentsJson
    ? (JSON.parse(command.argumentsJson) as Arguments)
    : [];
  return new osc.Message(
    command.tag,
    ...args.map((arg) => {
      if (arg.type == "int") {
        return Math.round(arg.value);
      } else return arg.value;
    })
  );
}

type ShouldRunParams = {
  iteration: number;
};

function shouldRunCommandHelper(
  condition: Condition,
  params: ShouldRunParams
): boolean {
  const keys = Object.keys(condition);
  if (keys.length == 0) return true;
  const hasOp = "AND" in condition || "OR" in condition;

  let isCurrentTrue = false;
  if (condition.mod) {
    if (params.iteration % condition.mod == 0) isCurrentTrue = true;
  }

  if (!hasOp) return isCurrentTrue;
  else {
    if ("AND" in condition && condition.AND) {
      return isCurrentTrue
        ? shouldRunCommandHelper(condition.AND, params)
        : false;
    } else if ("OR" in condition && condition.OR) {
      return isCurrentTrue
        ? true
        : shouldRunCommandHelper(condition.OR, params);
    }
    throw new Error("How the heck did you get here");
  }
}

export function shouldRunCommand(command: Command, params: ShouldRunParams) {
  if (!command.conditionJson) return true;
  const condition = JSON.parse(command.conditionJson) as Condition;
  return shouldRunCommandHelper(condition, params);
}

export const prisma = new PrismaClient();
