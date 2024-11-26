import { RichTextChild, RichTextBlock } from "@/types/main";
import React from "react";

export const renderRichText = (block: RichTextBlock, blockIndex: number) => {
    switch (block.type) {
      case "heading":
        return React.createElement(
          `h${block.level}`,
          {
            className: `text-${
              block.level === 1
                ? "4xl"
                : block.level === 2
                ? "3xl"
                : block.level === 3
                ? "2xl"
                : block.level === 4
                ? "xl"
                : block.level === 5
                ? "lg"
                : "base"
            } font-semibold mb-2 mt-4`,
            key: blockIndex,
          },
          block.children.map((child: RichTextChild, index: number) =>
            renderText(child, index)
          )
        );
      case "paragraph":
        return (
          <p className="mb-4 text-sm text-gray-600" key={blockIndex}>
            {block.children.map((child: RichTextChild, index: number) =>
              renderText(child, index)
            )}
          </p>
        );
      default:
        return null;
    }
  };
  

  
const renderText = (child: RichTextChild, index: number): React.ReactNode => {
    let textElement: React.ReactNode = child.text;
    if (child.bold) textElement = <strong key={index}>{textElement}</strong>;
    if (child.italic) textElement = <em key={index}>{textElement}</em>;
    if (child.underline) textElement = <u key={index}>{textElement}</u>;
    return textElement;
  };
  