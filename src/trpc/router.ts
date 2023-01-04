import { observable } from "@trpc/server/observable";
import { initTRPC } from "@trpc/server";
import { Trigger, prisma } from "../prisma/helpers";
import type { Command, Group, Target } from "@prisma/client";
import EventEmitter from "events";
import { z } from "zod";
import Timer from "tiny-timer";
import { sendMessages } from "../osc";

const t = initTRPC.create();

type State = {
  groups: (Group & { commands: (Command & { target: Target })[] })[];
  targets: Target[];
};
const timers: Map<number, Timer> = new Map();

let state: State | null = null;

export const ee = new EventEmitter();

export type OscTimer = {
  duration: number;
  state: "idle" | "paused" | "running";
  iteration: number;
};

const timersState = {} as { [groupId: number]: OscTimer };

export type TimersState = typeof timersState;

function genTimer(group: Group & { commands: Command[] }) {
  const trigger = JSON.parse(group.triggerJson) as Trigger;
  const timer = new Timer({ stopwatch: false, interval: 1000 });
  timersState[group.id] = {
    duration: trigger.interval,
    iteration: 0,
    state: "idle",
  };
  timer.on("tick", (ms: number) => {
    timersState[group.id].duration = Math.round(ms / 1000);
    ee.emit("update_timers");
  });
  timer.on("done", () => {
    const cGroup = state?.groups.find((f) => f.id == group.id);
    if (cGroup) {
      const curTrigger = JSON.parse(cGroup.triggerJson) as Trigger;
      sendMessages(cGroup.commands, state?.targets ?? [], 0);
      timer.stop();
      timer.start(curTrigger.interval * 1000);
    } else {
      timer.stop();
    }
  });
  return timer;
}

export function loadStateFromDB() {
  prisma
    .$transaction([
      prisma.group.findMany({
        include: { commands: { include: { target: true } } },
      }),
      prisma.target.findMany(),
    ])
    .then((transaction) => {
      state = {
        groups: transaction[0],
        targets: transaction[1],
      };
      transaction[0].forEach((group) => {
        if (timers.has(group.id)) timers.get(group.id)!.stop();
        timers.set(group.id, genTimer(group));
      });
      ee.emit("update_state", state);
    });
}

const appRouter = t.router({
  getState: t.procedure.subscription(() => {
    return observable<State>((emit) => {
      const update = (data: State) => {
        emit.next(data);
      };

      ee.on("update_state", update);

      if (!state) {
        loadStateFromDB();
      } else {
        emit.next(state);
      }

      return () => {
        ee.off("update_state", update);
      };
    });
  }),
  getTimers: t.procedure.subscription(() => {
    return observable<typeof timersState>((emit) => {
      const update = (data: typeof timersState) => {
        emit.next(timersState);
      };

      ee.on("update_timers", update);

      emit.next(timersState);

      return () => {
        ee.off("update_timers", update);
      };
    });
  }),
  addTarget: t.procedure
    .input(z.object({ name: z.string(), host: z.string(), port: z.number() }))
    .mutation(async ({ input }) => {
      const target = await prisma.target.create({
        data: { host: input.host, name: input.name, port: input.port },
      });
      state?.targets.push(target);
      ee.emit("update_state", state);
    }),
  removeTarget: t.procedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await prisma.target.delete({ where: { id: input.id } });
      if (state) {
        const tIndex = state.targets.findIndex(
          (target) => target.id == input.id
        );
        tIndex != -1 && state.targets.splice(tIndex, 1);
        ee.emit("update_state", state);
      }
    }),
  addGroup: t.procedure
    .input(z.object({ name: z.string(), trigger: z.enum(["timer"]) }))
    .mutation(async ({ input }) => {
      const trigger: Trigger = { interval: 180, type: "timer" };
      const group = await prisma.group.create({
        data: { name: input.name, triggerJson: JSON.stringify(trigger) },
      });
      state?.groups.push({ ...group, commands: [] });
      timers.set(group.id, genTimer({ ...group, commands: [] }));
      ee.emit("update_state", { ...state });
      ee.emit("update_timers");
    }),
  editGroup: t.procedure
    .input(z.object({ groupId: z.number(), interval: z.number().nullable() }))
    .mutation(async ({ input }) => {
      const interval = input.interval;
      const group = await prisma.group.findUnique({
        where: { id: input.groupId },
      });
      if (!group) return;
      const trigger = JSON.parse(group.triggerJson) as Trigger;
      if (interval) {
        trigger.interval = interval;
        const tState = timersState[group.id];
        if (tState && tState.state != "running") {
          tState.duration = interval;
          ee.emit("update_timers");
        }
      }
      const newGroup = await prisma.group.update({
        where: { id: input.groupId },
        data: { triggerJson: JSON.stringify(trigger) },
        include: { commands: { include: { target: true } } },
      });

      if (state) {
        state.groups = state.groups.map((group) => {
          if (group.id != newGroup.id) return group;
          else return newGroup;
        });
      }

      ee.emit("update_state", { ...state });
    }),
  addCommand: t.procedure
    .input(
      z.object({
        groupId: z.number(),
        tag: z.string().startsWith("/"),
        argJson: z.string(),
        targetId: z.number(),
        offset: z.number(),
        condJson: z.string().nullable(),
        active: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const updatedGroup = await prisma.group.update({
        where: { id: input.groupId },
        data: {
          commands: {
            create: {
              offset: input.offset,
              tag: input.tag,
              argumentsJson: input.argJson,
              conditionJson: input.condJson,
              targetId: input.targetId,
              active: input.active,
            },
          },
        },
        include: { commands: { include: { target: true } } },
      });
      if (state) {
        const groupIndex = state.groups.findIndex(
          (group) => group.id == updatedGroup.id
        );
        if (groupIndex != -1) {
          state.groups[groupIndex] = updatedGroup;
        } else {
          state.groups.push(updatedGroup);
        }
        ee.emit("update_state", state);
      }
    }),
  editCommand: t.procedure.input(z.object({})).mutation(({}) => {
    // TODO
  }),
  removeCommand: t.procedure
    .input(
      z.object({
        groupId: z.number(),
        commandId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.group.update({
        where: { id: input.groupId },
        data: { commands: { delete: { id: input.commandId } } },
      });
      if (state) {
        const group = state.groups.find((group) => group.id == input.groupId);
        if (group) {
          group.commands = group.commands.filter(
            (command) => command.id != input.commandId
          );
        }
      }
      ee.emit("update_state", state);
    }),
  playbackControl: t.procedure
    .input(
      z.object({
        action: z.enum(["start", "stop", "reset"]),
        groupId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const timer = timers.get(input.groupId);
      const timState = timersState[input.groupId];
      const group = await prisma.group.findUnique({
        where: { id: input.groupId },
      });
      if (!timer || !group || !timState) return;
      const triggerInfo = JSON.parse(group.triggerJson) as Trigger;
      if (timState.state == "idle") {
        if (input.action == "start") {
          timer.start(triggerInfo.interval * 1000);
          timState.duration = triggerInfo.interval;
          timState.state = "running";
        }
      } else if (timState.state == "paused") {
        if (input.action == "reset") {
          timer.stop();
          timState.duration = triggerInfo.interval;
          timState.state = "idle";
        } else if (input.action == "start") {
          timer.resume();
          timState.state = "running";
        }
      } else if (timState.state == "running") {
        if (input.action == "stop") {
          timer.pause();
          timState.state = "paused";
        } else if (input.action == "reset") {
          timer.stop();
          timState.duration = triggerInfo.interval;
          timState.state = "idle";
        }
      }
      ee.emit("update_timers");
    }),
});

// Export type router type signature,
// NOT the router itself.
export const router = appRouter;
export type TRPCApiTpe = typeof appRouter;
