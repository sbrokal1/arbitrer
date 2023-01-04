import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, useEffect } from "react";
import { trpc, trpcWs } from "./utils/trpc";
import Targets from "./components/Targets";
import type { Command, Group, Target } from "@prisma/client";
import Groups from "./components/Groups";
import { FaEdit, FaCheck } from "react-icons/fa";
import { useEdit } from "./stores/useEdit";

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `http://${process.env.OSC_A_HOST ?? "localhost"}:${
            process.env.OSC_A_PORT ?? "8069"
          }/trpc`,
        }),
      ],
    })
  );
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [groups, setGroups] = useState<
    (Group & { commands: (Command & { target: Target })[] })[] | null
  >(null);
  useEffect(() => {
    trpcWs.getState.subscribe(undefined, {
      onData(value) {
        console.log(value);
        setTargets(() => value.targets);
        setGroups(() => value.groups);
      },
    });
  }, []);

  const { editing, setEdit } = useEdit();

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="flex min-h-screen w-[100vw] flex-col items-center justify-start bg-slate-100">
          {targets && <Targets targets={targets ?? []} />}

          {groups && <Groups groups={groups} targets={targets ?? []} />}
          <div className="absolute bottom-5 right-5">
            <span
              className="tooltip block rounded-full border-2 border-sky-800 bg-sky-600 pl-4 pb-4 pr-3 pt-3 text-white shadow transition-all hover:cursor-pointer hover:bg-sky-700"
              data-tip={editing ? "Normal Mode" : "Edit Mode"}
              onClick={() => {
                setEdit(!editing);
              }}
            >
              {editing ? <FaCheck size={50} /> : <FaEdit size={50} />}
            </span>
          </div>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
