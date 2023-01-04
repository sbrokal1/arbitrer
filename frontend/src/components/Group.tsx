import type { Command, Group, Target } from "@prisma/client";
import { useState } from "react";
import { FaPlay, FaPause, FaStop } from "react-icons/fa";
import NewCommand from "./NewCommand";
import CommandComponent from "./Command";
import type { TimersState } from "../../../src/trpc/router";
import { trpc } from "../utils/trpc";
import { useEdit } from "../stores/useEdit";
import type { Trigger } from "../../../src/prisma/helpers";

type Props = {
  group: Group & { commands: (Command & { target: Target })[] };
  targets: Target[];
  timerState: TimersState[keyof TimersState];
};

function GroupComponent({ group, targets, timerState }: Props) {
  const duration = timerState.duration;
  const { editing, useValue } = useEdit();
  const [newCommandSubmits, setNewCommandSubmits] = useState<{
    [index: number]: () => Promise<void>;
  }>({});
  const newCommandCnt = Object.keys(newCommandSubmits).length;

  const [newCommandValids, setNewCommandValids] = useState(
    {} as { [index: number]: boolean }
  );

  const playbackControl = trpc.playbackControl.useMutation();

  const editGroup = trpc.editGroup.useMutation();

  const formatTime = (duration: number) => {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const timerString = `${mins}:${("00" + secs).slice(-2)}`;
    return timerString;
  };
  const timerString = formatTime(duration);

  const showPlay = ["idle", "paused"].includes(timerState.state);
  const showPause = ["running"].includes(timerState.state);
  const showStop = ["running", "paused"].includes(timerState.state);

  const entrys = Object.entries(newCommandValids);
  const saveButtonDisabled = !(
    entrys.every((entry) => entry[1]) && entrys.length === newCommandCnt
  );

  const trigger = JSON.parse(group.triggerJson) as Trigger;

  const { value: interval, setValue: setTimerInterval } = useValue(
    `group[${group.id}].interval`,
    formatTime(trigger.interval),
    (interval, defaultValue) => {
      if (!interval.match(/^\d{1,2}:\d{2}$/)) return;
      if (interval !== defaultValue) {
        const [mins, secs] = interval.split(":");
        const dur = parseInt(mins) * 60 + parseInt(secs);
        editGroup.mutate({ groupId: group.id, interval: dur });
      }
    }
  );

  return (
    <div
      key={`group${group.id}`}
      className="mt-2 flex w-[90vw] flex-col overflow-auto rounded-md bg-white p-4 shadow-md"
    >
      <p className="text-xl font-semibold">Group: {group.name}</p>
      <p className="mt-2 text-left font-semibold">Timer</p>
      <div className="flex items-center gap-10">
        {editing ? (
          <input
            type="text"
            className="input-bordered input input-sm w-20 pl-0 text-2xl"
            value={interval}
            onChange={(e) => {
              setTimerInterval(e.target.value);
            }}
          />
        ) : (
          <p className="text-2xl">{timerString}</p>
        )}
        <button
          className="tooltip hover:cursor-pointer disabled:text-gray-500 disabled:hover:cursor-default"
          disabled={!showPlay}
          data-tip="Play"
          onClick={() => {
            playbackControl.mutate({ action: "start", groupId: group.id });
          }}
        >
          <FaPlay />
        </button>
        <button
          className="tooltip hover:cursor-pointer disabled:text-gray-500 disabled:hover:cursor-default"
          disabled={!showPause}
          data-tip="Pause"
          onClick={() => {
            playbackControl.mutate({ action: "stop", groupId: group.id });
          }}
        >
          <FaPause />
        </button>
        <button
          className="tooltip hover:cursor-pointer disabled:text-gray-500 disabled:hover:cursor-default"
          disabled={!showStop}
          data-tip="Stop"
          onClick={() => {
            playbackControl.mutate({ action: "reset", groupId: group.id });
          }}
        >
          <FaStop />
        </button>
      </div>
      <p className="mt-2 mb-1 text-left font-semibold">Commands</p>
      <table className="table w-[72rem] border-collapse border">
        <thead>
          <tr>
            <th>#</th>
            <th>Target</th>
            <th>Active</th>
            <th>Offset(sec)</th>
            <th>Tag</th>
            <th>Arguments</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {group.commands.map((command, index) => (
            <CommandComponent
              command={command}
              index={index}
              key={`command${command.id}${group.id}`}
            />
          ))}
          {[...Array(newCommandCnt)].map((_, i) => (
            <NewCommand
              group={group}
              targets={targets}
              index={i}
              onLoadForm={(index, submit) => {
                if (submit !== newCommandSubmits[index])
                  setNewCommandSubmits((v) => ({ ...v, [index]: submit }));
              }}
              onValid={(valid) => {
                setNewCommandValids((state) => {
                  if (state[i] === valid) return state;
                  state[i] = valid;
                  return { ...state };
                });
              }}
            />
          ))}
        </tbody>
      </table>
      <div className="flex gap-3">
        <button
          className="mt-2 w-fit rounded-md bg-blue-600 px-2 text-lg font-semibold text-white shadow-sm hover:bg-blue-700"
          onClick={() =>
            setNewCommandSubmits((cur) => ({
              ...cur,
              [newCommandCnt]: async () => {},
            }))
          }
        >
          Add new...
        </button>
        {newCommandCnt > 0 && (
          <button
            className="tooltip mt-2 w-fit rounded-md bg-green-600 px-2 text-lg font-semibold text-white shadow-sm enabled:hover:bg-green-700 disabled:bg-gray-600"
            data-tip={
              saveButtonDisabled ? "Incomplete new commands" : "Save commands"
            }
            onClick={async () => {
              for (const entry of Object.entries(newCommandSubmits)) {
                await entry[1]();
              }
              setNewCommandSubmits({});
            }}
            disabled={saveButtonDisabled}
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}

export default GroupComponent;
