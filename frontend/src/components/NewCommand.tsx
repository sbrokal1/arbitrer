import type { Group, Target } from "@prisma/client";
import { useState } from "react";
import type { Arguments } from "../../../src/prisma/helpers";
import { FaTimes } from "react-icons/fa";
import { Formik } from "formik";
import * as Yup from "yup";
import { z } from "zod";
import { trpc } from "../utils/trpc";

type Props = {
  targets: Target[];
  index: number;
  onValid: (valid: boolean) => void;
  onLoadForm: (index: number, submit: () => Promise<void>) => void;
  group: Group;
};

function NewCommand({ targets, index, onValid, group, onLoadForm }: Props) {
  const addCommand = trpc.addCommand.useMutation();
  return (
    <Formik
      initialValues={{
        target: "",
        active: true,
        offset: 0,
        tag: "/",
        args: [] as Arguments,
      }}
      validationSchema={Yup.object({
        target: Yup.string()
          .required()
          .oneOf(targets.map((target) => target.id.toString())),
        active: Yup.boolean().required(),
        offset: Yup.number().required(),
        tag: Yup.string()
          .required()
          .test(
            "Check prefix",
            () => `Must start with /`,
            (val) => {
              return val?.startsWith("/") ?? false;
            }
          ),
        args: Yup.array(
          Yup.object({
            type: Yup.string(),
            value: Yup.string().test(
              "appropriate value",
              (t) => `Invalid format`,
              (val, f) => {
                if (!val) return false;
                const type = f.parent.type as string;
                if (type === "int")
                  return !isNaN(Number(val)) && Number.isInteger(Number(val));
                else if (type === "float") return !isNaN(Number(val));
                else return true;
              }
            ),
          })
        ),
      })}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        const argJson = JSON.stringify(
          values.args.map((arg) => {
            if (arg.type !== "string") arg.value = Number(arg.value);
            return arg;
          })
        );
        await addCommand.mutateAsync({
          targetId: parseInt(values.target),
          offset: values.offset,
          groupId: group.id,
          tag: values.tag,
          argJson,
          condJson: "{}",
          active: values.active,
        });
        setSubmitting(false);
      }}
    >
      {({
        getFieldProps,
        setFieldValue,
        values,
        errors,
        touched,
        setTouched,
        submitForm,
      }) => {
        onLoadForm(index, submitForm);
        if (
          Object.keys(errors).length === 0 &&
          Object.keys(touched).length > 0
        ) {
          onValid(true);
        } else {
          onValid(false);
        }
        return (
          <tr>
            <td>New</td>
            <td>
              <select
                className="select w-full"
                placeholder="Select Target"
                onChange={(e) => {
                  setTouched({ ...touched, target: true });
                  setFieldValue("target", e.target.value);
                }}
                value={values.target ?? ""}
              >
                <option disabled value="">
                  --Choose Target--
                </option>
                {targets.map((target) => (
                  <option
                    key={`newcommandtarget${target.id}`}
                    value={target.id}
                  >
                    {target.name}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input
                type="checkbox"
                className="checkbox"
                id="active"
                checked={values.active}
                {...getFieldProps("active")}
              />
            </td>
            <td>
              <input
                type="text"
                className={"input input-md w-32 "}
                {...getFieldProps("offset")}
              />
            </td>
            <td>
              <input
                type="text"
                className={"input-bordered input "}
                {...getFieldProps("tag")}
              />
            </td>
            <td>
              <span className="flex flex-col gap-2">
                {values.args?.map((arg, i) => {
                  let color = "purple";
                  if (arg.type === "float") color = "yellow";
                  else if (arg.type === "string") color = "green";
                  return (
                    <span
                      className={`w-fit rounded-full border border-${color}-700 bg-${color}-200 px-2 py-0.5 text-sm`}
                    >
                      <input
                        type="text"
                        className="appearance-none bg-transparent p-0.5"
                        {...getFieldProps(`args[${i}].value`)}
                      />
                      <button
                        onClick={() => {
                          setFieldValue(
                            "args",
                            values.args.filter((arg, index) => index !== i)
                          );
                        }}
                      >
                        <FaTimes className="tooltip" data-tip="Delete" />
                      </button>
                    </span>
                  );
                })}
                <span className="flex flex-row gap-1">
                  <button
                    className="tooltip rounded-full border border-purple-700 bg-purple-200 px-2 py-0.5 text-sm"
                    data-tip="Add Integer Argument (0-4294967295)"
                    onClick={() => {
                      setFieldValue("args", [
                        ...values.args,
                        { type: "int", value: "0" },
                      ]);
                    }}
                  >
                    Int
                  </button>
                  <button
                    className="tooltip rounded-full border border-yellow-700 bg-yellow-200 px-2 py-0.5 text-sm"
                    data-tip="Add Float (IEEE standard)"
                    onClick={() => {
                      setFieldValue("args", [
                        ...values.args,
                        { type: "float", value: "0.0" },
                      ]);
                    }}
                  >
                    Float
                  </button>
                  <button
                    className="tooltip rounded-full border border-green-700 bg-green-200 px-2 py-0.5 text-sm"
                    data-tip="Add String"
                    onClick={() => {
                      setFieldValue("args", [
                        ...values.args,
                        { type: "string", value: "Hello World" },
                      ]);
                    }}
                  >
                    String
                  </button>
                </span>
              </span>
            </td>
          </tr>
        );
      }}
    </Formik>
  );
}

export default NewCommand;
