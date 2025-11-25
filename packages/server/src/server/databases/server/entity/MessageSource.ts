import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

@Entity({ name: "message_source" })
export class MessageSource {
    @PrimaryColumn("text", { name: "message_guid", nullable: false, unique: true })
    messageGuid: string;

    @Column("text", { name: "source", nullable: true })
    source: string | null;

    @CreateDateColumn()
    created: Date;
}

