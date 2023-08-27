import type { GeneratorOptions } from "@prisma/generator-helper";
import { mkdirSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import { getTypeScriptType } from "./utils";

export async function onGenerate(options: GeneratorOptions) {
  let exportedTypes = "";
  const dataModel = options.dmmf.datamodel;

  // Convert Prisma models to TypeScript interfaces
  for (const model of dataModel.models) {
    exportedTypes += `export interface ${model.name} {\n`;

    // Only convert fields with kind "scalar" and "enum"
    const scalarAndEnumFields = model.fields.filter((field) =>
      ["scalar", "enum"].includes(field.kind),
    );

    for (const field of scalarAndEnumFields) {
      // A utility function to convert Prisma types to TypeScript types
      // We'll create this function later.
      const typeScriptType = getTypeScriptType(field.type);
      // Whether the field should be optional
      const nullability = field.isRequired ? "" : "| null";
      // Whether the field should be an array
      const list = field.isList ? "[]" : "";

      exportedTypes += `${field.name}: ${typeScriptType}${nullability}${list};\n`;
    }

    exportedTypes += "}\n\n";
  }

  // Convert Prisma enums to TypeScript types (Prisma object enums).
  // See below how to use TypeScript "enum"s instead.
  for (const enumType of dataModel.enums) {
    exportedTypes += `export const ${enumType.name} = {`;

    for (const enumValue of enumType.values) {
      exportedTypes += `${enumValue.name}: "${enumValue.name}",\n`;
    }

    exportedTypes += "} as const;\n";

    exportedTypes += `export type ${enumType.name} = (typeof ${enumType.name})[keyof typeof ${enumType.name}];\n\n`;
  }

  // Write the generated types to a file
  const outputDir = options.generator.output?.value ?? "./types";
  const fullLocaltion = `${outputDir}/index.ts`;

  // Make sure the output directory exists, if not create it
  mkdirSync(outputDir, { recursive: true });

  // Format the generated code
  const formattedCode = await format(exportedTypes, {
    // ... your preferred prettier options
    parser: "typescript",
  });

  // Write the formatted code to a file
  writeFileSync(fullLocaltion, formattedCode);
}
