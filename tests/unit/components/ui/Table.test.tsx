import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/Table";

describe("TableRow", () => {
  it("keeps read-only rows visually static by default", () => {
    render(
      <Table>
        <TableBody>
          <TableRow data-testid="static-row">
            <TableCell>Financial history</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const row = screen.getByTestId("static-row");
    expect(row).not.toHaveClass("hover:bg-surface-secondary/60");
    expect(row).not.toHaveClass("transition-[background-color]");
  });

  it("opts real interactions into visual hover without adding behavior", () => {
    render(
      <Table>
        <TableBody>
          <TableRow
            data-testid="interactive-row"
            interactive
            className="cursor-pointer"
          >
            <TableCell>Open team</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const row = screen.getByTestId("interactive-row");
    expect(row).toHaveClass(
      "cursor-pointer",
      "hover:bg-surface-secondary/60",
      "transition-[background-color]",
    );
    expect(row).not.toHaveAttribute("interactive");
    expect(row).not.toHaveAttribute("role");
    expect(row).not.toHaveAttribute("tabindex");
  });

  it("retains selected-state styling independently of interaction", () => {
    render(
      <Table>
        <TableBody>
          <TableRow data-testid="selected-row" data-state="selected">
            <TableCell>Selected team</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByTestId("selected-row")).toHaveClass(
      "data-[state=selected]:bg-surface-secondary",
    );
  });
});
