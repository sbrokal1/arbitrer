import create from "zustand";

const start = {
  editing: false,
  vals: {} as { [uid: string]: any },
  changes: {} as {
    [uid: string]: {
      data: any;
      cb: (val: any, defaultValue: any) => void;
      defaultValue: any;
    };
  },
  setEdit: (edit: boolean) => {},
  useValue: <T,>(
    uid: string,
    defaultValue: T,
    save: (value: T, defaultValue: T) => void
  ) => ({
    value: defaultValue,
    setValue: (n: typeof defaultValue) => {},
  }),
};

export const useEdit = create<typeof start>((set, get) => ({
  ...start,
  setEdit: (edit) => {
    if (!edit) {
      // We need to save changes
      Object.entries(get().changes).forEach((entry) => {
        entry[1].cb(entry[1].data, entry[1].defaultValue);
      });
      set({ changes: {}, vals: {} });
    }
    set({ editing: edit });
  },
  useValue: <T,>(
    uid: string,
    defaultValue: T,
    save: (value: T, defaultValue: T) => void
  ) => ({
    value: (get().vals[uid] ?? defaultValue) as T,
    setValue: (n) => {
      set({
        changes: {
          ...get().changes,
          [uid]: { data: n, cb: save, defaultValue: defaultValue },
        },
      });
      set({ vals: { ...get().vals, [uid]: n } });
    },
  }),
}));
