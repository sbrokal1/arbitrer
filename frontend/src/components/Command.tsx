import type { Command, Group, Target } from "@prisma/client";
import { useState } from "react";
import type { Arguments } from "../../../src/prisma/helpers";
import { FaTimes } from "react-icons/fa";
import { trpc } from "../utils/trpc";

type Props = {
  command: Command & { target: Target };
  index: number;
};

function CommandComponent({ command, index }: Props) {
  const args = JSON.parse(command.argumentsJson ?? "[]") as Arguments;
  const deleteCommand = trpc.removeCommand.useMutation();
  return (
    <tr>
      <td>{index + 1}</td>
      <td>{command.target.name}</td>
      <td>
        <input
          type="checkbox"
          className="checkbox"
          id="active"
          readOnly
          checked={true}
        />
      </td>
      <td>{command.offset}</td>
      <td>{command.tag}</td>
      <td>
        <span className="flex flex-col gap-2">
          {args.map((arg, i) => {
            let color = "purple";
            if (arg.type === "float") color = "yellow";
            else if (arg.type === "string") color = "green";
            return (
              <span
                className={`w-fit rounded-full border border-${color}-700 bg-${color}-200 px-2 py-0.5 text-sm`}
                key={`arg${arg.type}${command.id}`}
              >
                {arg.value}
              </span>
            );
          })}
        </span>
      </td>
      <td>
        <span
          className="tooltip hover:cursor-pointer"
          data-tip="Delete this command"
          onClick={() => {
            deleteCommand.mutate({
              commandId: command.id,
              groupId: command.groupId,
            });
          }}
        >
          <FaTimes />
        </span>
      </td>
    </tr>
  );
}

export default CommandComponent;
