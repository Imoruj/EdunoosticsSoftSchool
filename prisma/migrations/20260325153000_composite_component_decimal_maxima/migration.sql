-- Alter composite component maxima to preserve decimal split values such as 7.5 + 7.5 = 15
ALTER TABLE "CompositeSubjectComponent"
  ALTER COLUMN "ca1Max" TYPE DECIMAL(5, 2) USING "ca1Max"::DECIMAL(5, 2),
  ALTER COLUMN "ca2Max" TYPE DECIMAL(5, 2) USING "ca2Max"::DECIMAL(5, 2),
  ALTER COLUMN "ca3Max" TYPE DECIMAL(5, 2) USING "ca3Max"::DECIMAL(5, 2),
  ALTER COLUMN "examMax" TYPE DECIMAL(5, 2) USING "examMax"::DECIMAL(5, 2);
