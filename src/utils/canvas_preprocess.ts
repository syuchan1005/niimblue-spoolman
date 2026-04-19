import * as fabric from "fabric";
import QRCode from "$/fabric-object/qrcode";
import Barcode from "$/fabric-object/barcode";
import dayjs from "dayjs";
import { TextboxExt } from "$/fabric-object/textbox-ext";

const VARIABLE_TEMPLATE_RX = /{\s*([^{}|]+?)\s*(?:\|\s*(.*?)\s*)?}/g;

const preprocessDateTime = (format?: string) => {
  const dt = dayjs();
  if (format) {
    return dt.format(format);
  }
  return dt.format("YYYY-MM-DD HH:mm:ss");
};

const templateValueToString = (value: unknown): string => {
  if (value === undefined) {
    return "";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return JSON.stringify(value);
};

const parsePath = (path: string): Array<string | number> | null => {
  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }

  const tokens: Array<string | number> = [];
  let token = "";
  let i = 0;

  const flushToken = () => {
    if (token.length > 0) {
      tokens.push(token);
      token = "";
    }
  };

  while (i < trimmed.length) {
    const ch = trimmed[i];

    if (ch === ".") {
      flushToken();
      i++;
      continue;
    }

    if (ch === "[") {
      flushToken();

      const closeIndex = trimmed.indexOf("]", i + 1);
      if (closeIndex === -1) {
        return null;
      }

      const inside = trimmed.slice(i + 1, closeIndex).trim();

      if (/^\d+$/.test(inside)) {
        tokens.push(Number.parseInt(inside, 10));
      } else if ((inside.startsWith("\"") && inside.endsWith("\"")) || (inside.startsWith("'") && inside.endsWith("'"))) {
        const quote = inside[0];
        const raw = inside.slice(1, -1);
        const unquoted =
          quote === "\""
            ? JSON.parse(inside)
            : raw.replaceAll("\\\\", "\\").replaceAll("\\'", "'");
        tokens.push(unquoted);
      } else if (inside.length > 0) {
        tokens.push(inside);
      } else {
        return null;
      }

      i = closeIndex + 1;
      continue;
    }

    token += ch;
    i++;
  }

  flushToken();

  return tokens.length > 0 ? tokens : null;
};

const resolveTemplateValue = (variables: Record<string, unknown>, key: string): unknown => {
  if (key in variables) {
    return variables[key];
  }

  const tokens = parsePath(key);
  if (tokens === null) {
    return undefined;
  }

  let current: unknown = variables;

  for (const token of tokens) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof token === "number") {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[token];
      continue;
    }

    if (typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[token];
  }

  return current;
};

const preprocessString = (input: string, variables?: Record<string, unknown>): string => {
  return input.replace(VARIABLE_TEMPLATE_RX, (src, key, filter) => {
    const normalizedKey = String(key).trim();

    if (normalizedKey === "dt") {
      return preprocessDateTime(filter);
    }

    if (variables !== undefined) {
      const resolved = resolveTemplateValue(variables, normalizedKey);
      if (resolved !== undefined) {
        return templateValueToString(resolved);
      }
    }

    return "?";
  });
};

/** Replace text templates in some canvas objects */
export const canvasPreprocess = (canvas: fabric.Canvas, variables?: Record<string, unknown>) => {
  canvas.forEachObject((obj: fabric.FabricObject) => {
    if (obj instanceof fabric.IText) {
      const text = preprocessString(obj.text ?? "", variables);

      if (obj instanceof TextboxExt && obj.fontAutoSize) {
        obj.setAndShrinkText(text, obj.width);
      } else {
        obj.set({ text });
      }
    } else if (obj instanceof QRCode || obj instanceof Barcode) {
      obj.set({ text: preprocessString(obj.text ?? "", variables) });
    }
  });
};
