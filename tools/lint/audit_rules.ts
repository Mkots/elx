// deno-lint-ignore-file no-explicit-any
const plugin: Deno.lint.Plugin = {
  name: "audit",
  rules: {
    "prefer-number-static": {
      create(context) {
        return {
          CallExpression(node: any) {
            const callee = node.callee;
            if (
              callee.type === "Identifier" &&
              ["parseInt", "isNaN", "parseFloat", "isFinite"].includes(
                callee.name,
              )
            ) {
              context.report({
                node,
                message:
                  `Use 'Number.${callee.name}' instead of global '${callee.name}'`,
                fix(fixer: any) {
                  return fixer.insertTextBefore(callee, "Number.");
                },
              });
            }
          },
        };
      },
    },
    "require-sort-compare": {
      create(context) {
        function isExemptJSONStringifySort(node: any): boolean {
          const parent = node.parent;
          if (!parent || parent.type !== "CallExpression") {
            return false;
          }
          const callee = parent.callee;
          if (
            callee.type !== "MemberExpression" ||
            callee.object.type !== "Identifier" ||
            callee.object.name !== "JSON" ||
            callee.property.type !== "Identifier" ||
            callee.property.name !== "stringify"
          ) {
            return false;
          }
          let ancestor = parent.parent;
          while (ancestor) {
            if (
              ancestor.type === "BinaryExpression" &&
              (ancestor.operator === "===" || ancestor.operator === "!==")
            ) {
              return true;
            }
            ancestor = ancestor.parent;
          }
          return false;
        }

        return {
          CallExpression(node: any) {
            const callee = node.callee;
            if (
              callee.type === "MemberExpression" &&
              callee.property.type === "Identifier" &&
              (callee.property.name === "sort" ||
                callee.property.name === "toSorted") &&
              node.arguments.length === 0
            ) {
              if (isExemptJSONStringifySort(node)) {
                return;
              }

              const arrayText = context.sourceCode.getText(callee.object);
              const lowerText = arrayText.toLowerCase();
              const isStringish = lowerText.includes("word") ||
                lowerText.includes("text") ||
                lowerText.includes("name") ||
                lowerText.includes("version");

              const comparator = isStringish
                ? "(a, b) => String(a).localeCompare(String(b))"
                : "(a, b) => a - b";

              context.report({
                node,
                message:
                  `Provide a compare function to '.${callee.property.name}()'`,
                fix(fixer: any) {
                  const methodName = callee.property.name;
                  return fixer.replaceText(
                    node,
                    `${arrayText}.${methodName}(${comparator})`,
                  );
                },
              });
            }
          },
        };
      },
    },
    "prefer-replace-all": {
      create(context) {
        return {
          CallExpression(node: any) {
            const callee = node.callee;
            if (
              callee.type === "MemberExpression" &&
              callee.property.type === "Identifier" &&
              callee.property.name === "replace" &&
              node.arguments.length >= 1
            ) {
              const firstArg = node.arguments[0];
              const isGlobalRegex = (firstArg.type === "RegExpLiteral" &&
                firstArg.regex?.flags?.includes("g")) ||
                (firstArg.type === "Literal" &&
                  firstArg.regex?.flags?.includes("g"));

              if (isGlobalRegex) {
                context.report({
                  node,
                  message:
                    "Use '.replaceAll()' instead of '.replace()' with a global RegExp",
                  fix(fixer: any) {
                    return fixer.replaceText(callee.property, "replaceAll");
                  },
                });
              }
            }
          },
        };
      },
    },
    "require-new-array": {
      create(context) {
        return {
          CallExpression(node: any) {
            const callee = node.callee;
            if (
              callee.type === "Identifier" &&
              callee.name === "Array"
            ) {
              context.report({
                node,
                message: "Use 'new Array()' instead of 'Array()'",
                fix(fixer: any) {
                  return fixer.insertTextBefore(node, "new ");
                },
              });
            }
          },
        };
      },
    },
  },
};

export default plugin;
