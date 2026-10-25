import { describe, expect, it } from "vitest";
import {
  clampZoom,
  getZoom,
  logSliderToZoom,
  percentToZoom,
  setZoom,
  zoomToPercent,
  zoomToLogSlider,
} from "./zoom-store";

describe("zoom store", () => {
  it("clamps zoom to valid bounds", () => {
    expect(clampZoom(0.1)).toBe(0.25);
    expect(clampZoom(4)).toBe(3);
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it("round-trips percent to zoom", () => {
    expect(zoomToPercent(percentToZoom(125))).toBe(125);
    expect(zoomToPercent(0.75)).toBe(75);
  });

  it("maps logarithmic slider endpoints and midpoint to zoom", () => {
    expect(logSliderToZoom(0)).toBeCloseTo(0.25);
    expect(logSliderToZoom(1)).toBeCloseTo(3);
    expect(logSliderToZoom(zoomToLogSlider(1.25))).toBeCloseTo(1.25);
  });

  it("writes and reads the current zoom value", () => {
    const previous = getZoom();
    setZoom(0.5);
    expect(getZoom()).toBe(0.5);
    setZoom(previous);
  });
});
