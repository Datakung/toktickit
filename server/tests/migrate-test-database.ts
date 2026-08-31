import { configureTestDatabaseEnvironment } from "./support/test-database.js";
import { deployTestMigrations } from "./support/deploy-test-migrations.js";

configureTestDatabaseEnvironment();
deployTestMigrations();
