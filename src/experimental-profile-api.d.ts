import type {
  ExperimentalFullProfileV1,
  ExperimentalFullProfileV2,
  ExperimentalPetCatalogItem
} from "./index.js";

export type {
  ExperimentalFullProfileActivityInsights,
  ExperimentalFullProfileInvocation,
  ExperimentalFullProfileProfile,
  ExperimentalFullProfileStatus,
  ExperimentalFullProfileV1,
  ExperimentalFullProfileV2,
  ExperimentalPet,
  ExperimentalPetAvailable,
  ExperimentalPetCatalogItem,
  ExperimentalPetImage,
  ExperimentalPetReason,
  ExperimentalPetUnavailable
} from "./index.js";

export interface ExperimentalPetSourceOptions {
  codexHome?: string;
  env?: Record<string, string | undefined>;
  homeDir?: string;
}

export type ExperimentalPetSelector = (
  catalog: readonly ExperimentalPetCatalogItem[]
) => number | null | Promise<number | null>;

export interface ExperimentalProfileV1Options {
  timeoutMs?: number;
  includePet?: false;
}

export interface ExperimentalProfileV2Options
  extends ExperimentalPetSourceOptions {
  timeoutMs?: number;
  includePet: true;
  petKey?: number;
  selectPet?: ExperimentalPetSelector;
  forcePetSelection?: boolean;
}

export type ExperimentalProfileOptions =
  | ExperimentalProfileV1Options
  | ExperimentalProfileV2Options;

export declare function listExperimentalPets(
  options?: ExperimentalPetSourceOptions
): Promise<ExperimentalPetCatalogItem[]>;

export declare function readExperimentalProfile(
  options?: ExperimentalProfileV1Options
): Promise<ExperimentalFullProfileV1>;

export declare function readExperimentalProfile(
  options: ExperimentalProfileV2Options
): Promise<ExperimentalFullProfileV2>;
