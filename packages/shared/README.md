# @family-games/shared

Shared types, utilities, and validation logic for the Family Games platform.

## Structure

-   `types/` - TypeScript interfaces and types
-   `validation/` - Input validation functions (with future Zod schemas)
-   `utils/` - Utility functions (errors, player helpers, shuffle)
-   `constants/` - Game metadata and configuration constants

## Usage

```typescript
import { User, Room, GameData } from "@shared/types";
import { validatePlayerName } from "@shared/validation";
import { HttpError } from "@shared/utils";
import { TEAM_COLORS } from "@shared/constants";
```

## Development

```bash
# Build the shared package
pnpm build

# Watch mode for development
pnpm dev

# Clean build artifacts
pnpm clean
```

## Notes

This package is internal to the monorepo and is not published to npm. It uses workspace protocol for dependencies.
