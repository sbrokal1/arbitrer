import { Dialog } from "@headlessui/react";
import { Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import type { Command, Group, Target } from "@prisma/client";
import { IoIosAddCircle } from "react-icons/io";
import { trpc, trpcWs } from "../utils/trpc";
import GroupComponent from "./Group";
import type { TimersState } from "../../../src/trpc/router";

type Props = {
  groups: (Group & { commands: (Command & { target: Target })[] })[];
  targets: Target[];
};

function Groups({ groups, targets }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [timerState, setTimerState] = useState<TimersState>({});
  const addGroup = trpc.addGroup.useMutation();
  useEffect(() => {
    trpcWs.getTimers.subscribe(undefined, {
      onData: (data) => {
        setTimerState(data);
      },
    });
  }, []);
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) =>
        timerState[group.id] ? (
          <GroupComponent
            timerState={timerState[group.id]}
            key={`groupcomp${group.id}`}
            group={group}
            targets={targets}
          />
        ) : null
      )}
      <span className="flex flex-col items-center justify-center leading-none text-green-600">
        <IoIosAddCircle
          className="peer z-10 hover:cursor-pointer hover:text-green-700"
          size={72}
          onClick={() => {
            setShowCreate(true);
          }}
        />
        <span className="text-md -translate-y-10 rounded-md border bg-white p-1 font-semibold text-black opacity-0 shadow-md transition-all duration-75 peer-hover:translate-y-0 peer-hover:opacity-100">
          Add New Group
        </span>
      </span>

      <Transition appear show={showCreate} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setShowCreate(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Add a group
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">blah blah blah</p>
                  </div>
                  <input
                    type="text"
                    className="input-bordered input input-md mt-2 border-blue-400 focus:outline-blue-400"
                    placeholder="Group Name"
                    value={createGroupName}
                    onChange={(e) => {
                      setCreateGroupName(e.target.value);
                    }}
                  />

                  <div className="mt-4 flex gap-4">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => {
                        setShowCreate(false);
                        setCreateGroupName("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => {
                        if (createGroupName.length > 0) {
                          addGroup.mutate({
                            name: createGroupName,
                            trigger: "timer",
                          });
                        }
                        setShowCreate(false);
                        setCreateGroupName("");
                      }}
                    >
                      Add
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default Groups;
