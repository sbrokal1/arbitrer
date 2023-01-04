import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import type { Target } from "@prisma/client";
import { ImCross } from "react-icons/im";
import { table } from "console";

type Props = { targets: Target[] };

function Targets({ targets }: Props) {
  const addTarget = trpc.addTarget.useMutation();
  const deleteTarget = trpc.removeTarget.useMutation();
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  return (
    <div className="bg-white border-slate-500 border rounded-md flex flex-col  justify-center items-center">
      <p className="text-center font-semibold">Targets</p>
      <div className="flex flex-col my-2 mx-4 gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder="Name"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
        <input
          type="text"
          value={host}
          onChange={(e) => {
            setHost(e.target.value);
          }}
          placeholder="Host"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
        <input
          type="text"
          value={port}
          onChange={(e) => {
            setPort(e.target.value);
          }}
          placeholder="Port"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
        <button
          onClick={() => {
            if (name.length > 0 && host.length > 0 && !isNaN(parseInt(port))) {
              addTarget.mutate({ host, name, port: parseInt(port) });
            }
          }}
          className="shadow border rounded bg-emerald-600 text-white text-lg font-semibold w-full mb-2 hover:bg-emerald-700 transition-colors"
        >
          Add Target
        </button>
      </div>
      {targets.length > 0 && (
        <table className="table-auto border-collapse border border-slate-300 bg-white mb-2 mx-2">
          <thead>
            <tr className="border border-slate-300">
              <th className="border border-slate-300 p-1">Delete</th>
              <th className="border border-slate-300 p-1">Name</th>
              <th className="border border-slate-300 p-1">Host</th>
              <th className="border border-slate-300 p-1">Port</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr
                className="border border-slate-300"
                key={`target${target.id}`}
              >
                <td className="border border-slate-300 p-1">
                  <span className="w-full text-center">
                    <ImCross
                      className="m-auto text-red-600 hover:cursor-pointer"
                      onClick={() => {
                        deleteTarget.mutate({ id: target.id });
                      }}
                    />
                  </span>
                </td>
                <td className="border border-slate-300 p-1">{target.name}</td>
                <td className="border border-slate-300 p-1">{target.host}</td>
                <td className="border border-slate-300 p-1">{target.port}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Targets;
