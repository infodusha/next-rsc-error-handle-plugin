import path from "node:path";

import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

import {
  getRelativePath,
  isClientComponent,
  isReactElement,
  wrapWithFunction,
  getExistingFilePath,
} from "./utils.js";

const EXTENSIONS = ["js", "jsx", "ts", "tsx", "mjs", "mts", "cjs"]; // TODO get extensions from next config

const WRAPPER_NAME = "__rscWrapper";
const WRAPPER_PATH = "next-rsc-error-handler/src/wrapper.js";

export default function (source) {
  const options = this.getOptions();

  if (isClientComponent(source)) {
    return source;
  }

  const resourcePath = this.resourcePath;

  const globalHandler = getExistingFilePath(
    path.resolve("app", options.globalHandler),
    EXTENSIONS
  );

  this.addDependency(globalHandler);

  const ast = parse(source, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  let shouldAddImport = true;
  let wasWrapped = false;

  traverse.default(ast, {
    enter(p) {
      if (p.isImportDeclaration()) {
        const importPath = p.node.source.value;
        if (importPath.includes(WRAPPER_PATH)) {
          shouldAddImport = false;
        }
      }

      if (!p.isFunctionDeclaration() && !p.isArrowFunctionExpression()) {
        return;
      }

      if (!isReactElement(p)) {
        return;
      }

      const ctx = {
        filePath: getRelativePath(resourcePath),
        functionName: getFunctionName(p),
        globalHandler,
      };

      wasWrapped = true;
      wrapWithFunction(p, WRAPPER_NAME, ctx);
      p.skip();
    },
  });

  if (shouldAddImport && wasWrapped) {
    addImport(ast);
  }

  const output = generate.default(ast);
  return output.code;
}

function getFunctionName(p) {
  if (p.isFunctionDeclaration()) {
    return p.node.id?.name;
  }

  if (p.isArrowFunctionExpression()) {
    const parent = p.parentPath;
    if (parent.isVariableDeclarator() && parent.node.id.type === "Identifier") {
      return parent.node.id.name;
    }
  }

  return "unknown";
}

function addImport(ast) {
  const wrapperImport = t.importDeclaration(
    [t.importSpecifier(t.identifier(WRAPPER_NAME), t.identifier(WRAPPER_NAME))],
    t.stringLiteral(WRAPPER_PATH)
  );

  ast.program.body.unshift(wrapperImport);
}
