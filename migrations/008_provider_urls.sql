CREATE UNIQUE INDEX reserve_provider_slug ON reserve_providers(slug) WHERE slug IS NOT NULL;
