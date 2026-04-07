export function isDiscoverySchemaMissingError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    code?: string;
    message?: string;
  };

  return (
    maybeError.code === "P2021" ||
    maybeError.code === "P2022" ||
    maybeError.code === "42P01" ||
    maybeError.code === "42703" ||
    maybeError.code === "42704" ||
    maybeError.message?.includes("ArcMetrics") === true ||
    maybeError.message?.includes("ArcSearchDocument") === true ||
    maybeError.message?.includes("ArcReadState") === true ||
    maybeError.message?.includes("ArcTag") === true ||
    maybeError.message?.includes("publicSlug") === true ||
    maybeError.message?.includes("joinPolicy") === true ||
    maybeError.message?.includes("visibility") === true ||
    maybeError.message?.includes("searchVisibility") === true ||
    maybeError.message?.includes("allowDiscovery") === true
  );
}

export function isDiscoverySearchUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    code?: string;
    message?: string;
  };

  return (
    maybeError.code === "42883" ||
    maybeError.code === "42704" ||
    maybeError.message?.includes("similarity(") === true ||
    maybeError.message?.includes("websearch_to_tsquery") === true ||
    maybeError.message?.includes("gin_trgm_ops") === true ||
    maybeError.message?.includes("pg_trgm") === true
  );
}
