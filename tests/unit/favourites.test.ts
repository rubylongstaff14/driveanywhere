import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFavourites,
  isFavourite,
  subscribeFavourites,
  toggleFavourite,
} from "@/lib/database/mock/favourites";

const USER = "user-1";
const ROUTE = "route-a";

describe("mock favourites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(getFavourites(USER)).toEqual([]);
    expect(isFavourite(USER, ROUTE)).toBe(false);
  });

  it("adds and removes a favourite", () => {
    expect(toggleFavourite(USER, ROUTE)).toBe(true);
    expect(isFavourite(USER, ROUTE)).toBe(true);

    expect(toggleFavourite(USER, ROUTE)).toBe(false);
    expect(isFavourite(USER, ROUTE)).toBe(false);
  });

  it("keeps favourites separate per user", () => {
    toggleFavourite(USER, ROUTE);
    expect(getFavourites("user-2")).toEqual([]);
  });

  it("treats a signed-out visitor as having no favourites", () => {
    toggleFavourite(USER, ROUTE);
    expect(getFavourites(null)).toEqual([]);
    expect(isFavourite(null, ROUTE)).toBe(false);
  });

  it("notifies subscribers when favourites change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFavourites(listener);

    toggleFavourite(USER, ROUTE);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    toggleFavourite(USER, ROUTE);
    expect(listener).not.toHaveBeenCalled();
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("driveanywhere.favourites", "{not json");
    expect(getFavourites(USER)).toEqual([]);
  });
});
