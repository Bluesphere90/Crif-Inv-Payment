import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1767717351313 implements MigrationInterface {
    name = 'InitialSchema1767717351313'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sale_teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_190cd889f19954200db81135b22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('SALE_STAFF', 'SALE_LEADER', 'ACCOUNTING', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL, "sale_team_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "last_login_at" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invoice_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoice_id" uuid NOT NULL, "line_number" integer NOT NULL, "description" text NOT NULL, "quantity" numeric(10,2) NOT NULL, "unit_price" numeric(15,2) NOT NULL, "line_total" numeric(15,2) NOT NULL, "tax_rate" numeric(5,2), "tax_amount" numeric(15,2), "is_locked" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3d18eb48142b916f581f0c21a65" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payment_id" uuid NOT NULL, "invoice_number" character varying(100), "invoice_date" date, "customer_name" character varying(255), "customer_tax_code" character varying(50), "currency" character varying(3) NOT NULL, "total_amount" numeric(15,2), "converted_amount" numeric(15,2), "exchange_rate" numeric(10,4), "discrepancy_note" text, "is_locked" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "import_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "filename" character varying(255) NOT NULL, "imported_by" uuid NOT NULL, "imported_at" TIMESTAMP NOT NULL DEFAULT now(), "total_rows" integer NOT NULL, "successful_rows" integer NOT NULL, "failed_rows" integer NOT NULL, "error_log" jsonb, CONSTRAINT "PK_6162597a2576c03e04bb2c1a2dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."bank_transactions_status_enum" AS ENUM('NEW', 'DRAFT', 'SUBMITTED', 'COMPLETED', 'LOCKED')`);
        await queryRunner.query(`CREATE TABLE "bank_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payment_id" character varying(100) NOT NULL, "bank_account" character varying(100) NOT NULL, "payment_date" date NOT NULL, "amount" numeric(15,2) NOT NULL, "currency" character varying(3) NOT NULL, "pay_from" character varying(255) NOT NULL, "payment_description" text, "assigned_sale_team_id" uuid, "assigned_by" uuid, "assigned_at" TIMESTAMP, "status" "public"."bank_transactions_status_enum" NOT NULL DEFAULT 'NEW', "submitted_by" uuid, "submitted_at" TIMESTAMP, "unlocked_by" uuid, "unlocked_at" TIMESTAMP, "unlock_reason" text, "last_edited_by" uuid, "last_edited_at" TIMESTAMP, "import_batch_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_71d588094ad318ac958d5f13db5" UNIQUE ("payment_id"), CONSTRAINT "PK_123cc87304eefb2c497b4acdd10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payment_id" character varying(100), "entity_type" character varying(50) NOT NULL, "entity_id" uuid, "action" character varying(100) NOT NULL, "old_value" jsonb, "new_value" jsonb, "performed_by" uuid, "performed_at" TIMESTAMP NOT NULL DEFAULT now(), "ip_address" character varying(45), "user_agent" text, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_486d8a944b43e3e51fde279df7d" FOREIGN KEY ("sale_team_id") REFERENCES "sale_teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_lines" ADD CONSTRAINT "FK_2da95dc86a54a00ff20ce46d0fe" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_02781c49b25ceb502571f0315f6" FOREIGN KEY ("payment_id") REFERENCES "bank_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "import_batches" ADD CONSTRAINT "FK_d93011b50d58a6edb1f244908f2" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" ADD CONSTRAINT "FK_f37e9e71314fe279ad78b134836" FOREIGN KEY ("assigned_sale_team_id") REFERENCES "sale_teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" ADD CONSTRAINT "FK_c6221da6618622cf3bb1be34301" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" ADD CONSTRAINT "FK_90168941e77946ef293dee625a0" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" ADD CONSTRAINT "FK_6c1697a4166694bb0cffa02ab5e" FOREIGN KEY ("unlocked_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" ADD CONSTRAINT "FK_6cb2b2ced486e3bf63c4d6b8f8a" FOREIGN KEY ("last_edited_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" ADD CONSTRAINT "FK_cfb2d7743c357a184d01220ce2c" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_ae97aac6d6d471b9d88cea1c971" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_ae97aac6d6d471b9d88cea1c971"`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" DROP CONSTRAINT "FK_cfb2d7743c357a184d01220ce2c"`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" DROP CONSTRAINT "FK_6cb2b2ced486e3bf63c4d6b8f8a"`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" DROP CONSTRAINT "FK_6c1697a4166694bb0cffa02ab5e"`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" DROP CONSTRAINT "FK_90168941e77946ef293dee625a0"`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" DROP CONSTRAINT "FK_c6221da6618622cf3bb1be34301"`);
        await queryRunner.query(`ALTER TABLE "bank_transactions" DROP CONSTRAINT "FK_f37e9e71314fe279ad78b134836"`);
        await queryRunner.query(`ALTER TABLE "import_batches" DROP CONSTRAINT "FK_d93011b50d58a6edb1f244908f2"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_02781c49b25ceb502571f0315f6"`);
        await queryRunner.query(`ALTER TABLE "invoice_lines" DROP CONSTRAINT "FK_2da95dc86a54a00ff20ce46d0fe"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_486d8a944b43e3e51fde279df7d"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "bank_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."bank_transactions_status_enum"`);
        await queryRunner.query(`DROP TABLE "import_batches"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TABLE "invoice_lines"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "sale_teams"`);
    }

}
