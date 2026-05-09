import { connection } from "./redisClient.js";
import { Queue } from "bullmq";

export interface IssueJobData {
  issueNumber: number;
  issueTitle: string;
  issueBody: string | null; 
  repoName: string;
  repoFullName: string;
}

export const issueQueue=new Queue<IssueJobData>('IssueQueue',{
    connection
});