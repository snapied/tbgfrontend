# Shorter Loop Coding Guidelines

This document outlines the coding standards, best practices, and conventions derived from pull request reviews to ensure consistency and maintainability across the `covation-labs-backend` codebase.

## 1. Project Structure & Routing

- **API Versioning**: All new controller files should be placed under versioned directories (e.g., `/app/controllers/v1/` or `/app/controllers/v2/`). Do not add them directly under `/app/controllers/`.
- **Frontend Consistency**: Ensure frontend applications access new resources via the proper versioned roots (e.g., `/api/v2/...`).

## 2. Request Handling

- **Headers Over Params**: Always retrieve IDs like `initiativeId` and `productId` from `req.headers` instead of `req.params`. The latest product ID is passed by default in the request headers, ensuring it stays consistent across routes.

## 3. Error Handling

- **Restify Errors**: Use the `restify-errors` library instead of returning direct HTTP status codes. This keeps error handling consistent across endpoints.
  ```javascript
  import errors from 'restify-errors';
  // ...
  return next(new errors.MissingParameterError('Product ID is required'));
  ```

## 4. Naming Conventions

- **Camel Casing**: Follow `camelCase` for variable, function, and file names unless restricted by specific tool conventions.
- **Model Naming**: Model names must always be singular (e.g., use `accountModel` instead of `accountsModel` or `accounts`).
- **Descriptive Variables**: Avoid overly generic variable names. Strive for meaningful, descriptive names.
- **Meaningful Log Messages**: Provide clear, meaningful messages in errors, logs, and comments. Avoid placeholders like `########################`.

## 5. Database & Sequelize Practices

- **Null Handling**: Rely on Sequelize to handle missing data automatically. Avoid explicit data-cleaning loops to set empty strings to `null`. Simply define the model field with `allowNull: true` and ensure the database column defaults to `NULL`.
- **Default Attributes**: The `id` field is a default attribute in Sequelize, so there is no need to manually define it in every model.
- **Default Values**: Ensure models make use of `defaultValue` configurations where appropriate.
- **Performance**:
  - Use `await model.count(...)` instead of `await model.findOne(...)` or pulling arrays computationally when you only need standard totals.
  - Employ `sequelize.literal` with a subquery for counting associations rather than calculating totals in JavaScript logic.
  - Be cautious with deep cloning objects, as it negatively impacts performance.
- **Consistency in Status Tracking**: Use a standard `status` column with an enum type (e.g., `active`, `inactive`) rather than varying column forms like `is_active`.
- **Singleton connections**: When setting up the database connection class, automatically `authenticate()` inside the constructor and construct it cohesively (e.g., `Freeze` the instance, expose via getter `get sequelize()`). Store these within the `/models/` directory using appropriate naming like `DatabaseConnection` or `SequelizeManager`.

## 6. Business Logic, Controllers, and Middleware

- **Separation of Concerns**: Avoid overly packed middleware to fetch models dynamically. Opt for creating separate methods structured by work item or cleanly move core business logic entirely into dedicated services.
- **Refactoring**: Break down larger functions into smaller, manageable units well-documented with appropriate comments.
- **DRY (Don't Repeat Yourself)**: Eliminate duplicate query blocks across multiple functions (e.g., searching for a specific account). Extract such functionality into a static method or a shared helper function.
- **Async/Await**: Make use of `async`/`await` across the codebase instead of `.then().catch()` chains.

## 7. Security

- **Authentication**: Use the `validateSubscriptionAndProduct` middleware as the standard for route security and authentication. Be sure to order it early in your `app.use` or route handler sequences.
- **Migrations**: Don't manually invoke tasks redundantly. E.g., `npm run db:migrate` runs implicitly in the pipeline when PRs merge; redundant documentation or invocation introduces confusion.
- **Fail-Safes**: Ensure code is defensive—handle failure points gracefully so errors do not crash contexts unexpectedly.

## 8. File Uploads & Data Parsing

- **Express Fileupload**: Standardize on `express-fileupload` for managing multipart uploads.
- **Temporary Uploads**: Process uploaded files directly from the temporary folder (`tempFolder`). Copying files temporarily to standard `/uploads/...` directories before processing provides no advantage.
- **CSV Parsing**: Utilize `convert-csv-to-json` module methods, such as the `csvToJsonFileParser` utility found in `middlewares/getArtifactId.js`, to parse incoming CSV files into standard JSON.

## 9. Avoid Unnecessary Code & Checks

- If a functionality or module already exists globally (e.g., integrations helpers for Salesforce, Hubspot, GitHub, Azure), reuse it directly rather than rewriting it for local contexts.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
