import type { Command, Target } from "@prisma/client";
import OSC from "osc-js";
import { commandToOscMessage, shouldRunCommand } from "./prisma/helpers";

export function sendMessages(
  commands: Command[],
  targets: Target[],
  iteration: number
) {
  const targetIdToClient = new Map(
    targets.map((target) => {
      const client = new OSC({
        plugin: new OSC.DatagramPlugin({
          send: { host: target.host, port: target.port },
        } as any),
      });
      return [target.id, client];
    })
  );

  const commandsByTarget = new Map<number, Command[]>();

  for (const command of commands) {
    if (!targetIdToClient.has(command.targetId)) continue;
    if (shouldRunCommand(command, { iteration })) {
      if (!commandsByTarget.has(command.targetId))
        commandsByTarget.set(command.targetId, []);
      commandsByTarget.get(command.targetId)!.push(command);
    }
  }

  commandsByTarget.forEach((commands, targetId) => {
    const client = targetIdToClient.get(targetId);
    const bundle = new OSC.Bundle(
      commands.map(commandToOscMessage),
      Date.now()
    );
    client?.send(bundle);
  });
}
