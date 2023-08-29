"use server"

import { connectToDB } from "../mongoose";
import Thread from "../models/thread.model";
import Community from "../models/community.model";
import User from "../models/user.model";
import { revalidatePath } from "next/cache";
import { threadId } from "worker_threads";
import { revalidate } from "@/app/(root)/thread/[id]/page";

interface Params {
    text: string,
    author: string,
    communityId: string | null,
    path: string,
}

export async function createThread({ text, author, communityId, path }: Params) {
    try {
        connectToDB();
        const createThread = await Thread.create({
            text,
            author,
            community: null,
        });
        await User.findByIdAndUpdate(author, {
            $push: { threads: createThread._id }
        })
        revalidatePath(path)
    } catch (error) {

    }
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
    connectToDB();
    const skipAmount = (pageNumber - 1) * pageSize;
    const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
        .sort({ createAt: "desc" })
        .skip(skipAmount)
        .limit(pageSize)
        .populate({
            path: "author",
            model: User,
        })
        .populate({
            path: "community",
            model: Community,
        })
        .populate({
            path: "children",
            populate: {
                path: "author",
                model: User,
                select: "_id name parentId image",
            }
        });

    const totalPostsCount = await Thread.countDocuments({
        parentId: { $in: [null, undefined] },
    }); // Get the total count of posts

    const posts = await postsQuery.exec();

    const isNext = totalPostsCount > skipAmount + posts.length;

    return { posts, isNext };

}

export async function fetchThreadById(id: string) {
    connectToDB();
    try {

        const thread = await Thread.findById(id)
            .populate({
                path: "community",
                model: Community,
                select: "_id id name image",
            })
            .populate({
                path: "children",
                populate: [{
                    path: "author",
                    model: User,
                    select: "_id id name parentId image",
                },
                {
                    path: "children",
                    model: Thread,
                    populate: {
                        path: "author",
                        model: "User",
                        select: "_id id name parentId image",
                    },
                },
                ],
            })
            .exec();
        return thread;
    } catch (error: any) {

        throw new Error(`Unable to fetch thread: ${error.message}`);

    }
}

export async function addCommentToThread(
    threadId: string,
    commentText: string,
    userId: string,
    path: string
) {
    try {
        connectToDB();
        const originalThread = await Thread.findById(threadId);

        if (!originalThread) {
            throw new Error("Thread not found");
        }
        const commentThread = new Thread({
            text: commentText,
            author: userId,
            parentId: threadId,
        });

        const savedCommentThread = await commentThread.save();
        originalThread.children.push(savedCommentThread._id);

        await originalThread.save();
        revalidatePath(path);


    } catch (error: any) {

        throw new Error(`Unable to fetch thread: ${error.message}`);

    }
}