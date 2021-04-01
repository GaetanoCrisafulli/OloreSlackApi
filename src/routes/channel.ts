import { Router, Request, Response, NextFunction, request } from 'express';
import bodyparser from 'body-parser';
import { User } from '../interfaces/user';
import { Workspace } from '../interfaces/workspace';
import { Channel } from '../interfaces/channel';
import UIDGenerator from 'uid-generator';
import { body, validationResult } from 'express-validator';
import fs from 'fs';
import { Message } from '../interfaces/message';
import { Reply } from '../interfaces/reply';

let router = Router();
router.use(bodyparser.json());
router.use(bodyparser.urlencoded({ extended: true }));

const uidgen = new UIDGenerator();

const usersPath = process.cwd() + '/resources/users.json';
const workspacesPath = process.cwd() + '/resources/workspaces.json';
const channelsPath = process.cwd() + '/resources/channels.json';
const messagesPath = process.cwd() + '/resources/messages.json';
let usersReadByFile: User[] = [];
let workspacesReadByFile: Workspace[] = [];
let channelsReadByFile: Channel[] = [];
let messagesReadByFile: Message[] = [];


var errorsHandler = (req: Request, res: Response, next: NextFunction) => {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

let reloadFile = (_: Request, __: Response, next: NextFunction) => {
    usersReadByFile = readFile(usersPath) as User[];
    workspacesReadByFile = readFile(workspacesPath) as Workspace[];
    channelsReadByFile = readFile(channelsPath) as Channel[];
    messagesReadByFile = readFile(messagesPath) as Message[];
    next();
}

let getChannelName = ({ headers: { channel_id } }: Request, res: Response) => {
    let channel = channelsReadByFile.find(item => item.id === channel_id);
    channel && res.status(200).json(channel.name) || res.status(404).json({ message: "channel not found" })
}

let getAllUsers = ({ headers: { channel_id } }: Request, res: Response) => {
    let users: string[] = [];
    let channel = channelsReadByFile.find(item => item.id === channel_id);
    users = channel!.usersList
    res.status(200).json(users);
}

let createMessage = ({ headers: { channel_id, user_email }, body: { content } }: Request, res: Response) => {
    let messageId = uidgen.generateSync()
    let message: Message = { id: messageId, userId: user_email as string, content: content, time: new Date(), replies: [] }
    if (message.content.length != 0) {
        messagesReadByFile.push(message);
        channelsReadByFile.find(channel => channel.id == channel_id)?.messagesList.push(messageId)
        updateFile(channelsReadByFile, channelsPath);
        updateFile(messagesReadByFile, messagesPath);
        res.status(200).json({ message: "message sended", messageId })
    } else { res.status(400).json({ message: "cannot send an empty message"}) }
}

let replyMessage = ({ headers: { user_email, message_id }, body: { content } }: Request, res: Response) => {
    let replyId = uidgen.generateSync()
    let reply: Reply = { id: replyId, userId: String(user_email), content: content, time: new Date() }
    if (reply.content.length != 0) {
        messagesReadByFile.find(item => item.id === message_id)?.replies.push(reply);
        updateFile(messagesReadByFile, messagesPath);
        res.status(200).json({ message: "message replied" })
    } else { res.status(400).json({ message: "cannot reply with an empty message" }) }
}

let getAllMessages = ({ headers: { channel_id } }: Request, res: Response) => {
    let messagesId = channelsReadByFile.find(item => item.id == channel_id)?.messagesList;
    let messages: Message[] = [];
    messagesId?.forEach(id => messagesReadByFile.find((message) => {
        message.id === id && messages.push(message);
    }));
    messages && res.status(200).json(messages) || res.status(400).json({ message: "Error" });
}

let addToChannel = ({ headers: { to_add, channel_id, workspace_id } }: Request, res: Response) => {
    let channel = channelsReadByFile.find(channel => channel.id == channel_id);
    let workspace = workspacesReadByFile.find(workspace => workspace.id == workspace_id);
    if (to_add?.includes(',')) {
        to_add = String(to_add).split(',')
        to_add.forEach(receiverEmail => (channel?.usersList.find(email => email !== receiverEmail) && workspace?.usersList.find(email => email == receiverEmail))
            && channel.usersList.push(receiverEmail))
        updateFile(channelsReadByFile, channelsPath)
        res.status(200).json({ message: "users added to channel" })
    } else {
        if (!channel?.usersList.find(email => email === to_add) && workspace?.usersList.find(email => email === to_add)) {
            channel?.usersList.push(to_add as string);
            updateFile(channelsReadByFile, channelsPath);
            res.status(200).json({ message: "User added to channel" });
        } else {
            res.status(418).json({ message: "The user is already in the channel or it doesn't exist in this workspace" })
        }
    }
}

let leaveChannel = ({ headers: { user_email, channel_id } }: Request, res: Response) => {
    let channel = channelsReadByFile.find(channel => channel.id == channel_id)
    if(channel?.usersList.find(email => email === user_email)) {
        channel.usersList.splice(channel.usersList.indexOf(String(user_email)), 1)
        updateFile(channelsReadByFile, channelsPath)
    }
    res.status(200).json({ message: "user deleted from channel" })
}

let getUserName = ({ headers: { user_email } }: Request, res: Response) => {
    let { username } = usersReadByFile.find(user => user.email === user_email) as User;
    username && res.status(200).json(username) || res.status(404).json({ message: "user not found" })
}

let deleteMessage = ({ headers: { tkn, channel_id, message_id } }: Request, res: Response) => {
    let user = usersReadByFile.find(user => user.token === tkn);
    let channel = channelsReadByFile.find(channel => channel.id === channel_id);
    let message = messagesReadByFile.find(message => message.id === message_id);

    if(message) {
        if(message.userId === user?.email) {
            let indexToRemoveChannel = channel?.messagesList.indexOf(message_id as string)
            let indexToRemoveMessages = messagesReadByFile.indexOf(message);
            indexToRemoveChannel && (channel?.messagesList.splice(indexToRemoveChannel, 1))
            messagesReadByFile.splice(indexToRemoveMessages, 1);
            updateFile(channelsReadByFile, channelsPath);
            updateFile(messagesReadByFile, messagesPath);
            return res.status(200).json({ message: "Message deleted" });
        }else{
            return res.status(400).json({message: "You can't delete this message"})
        }
    }
    res.status(404).json({message: "Message not found"})
}

function readFile(filePath: string) {
    let rawdata = fs.readFileSync(filePath);
    let container = JSON.parse(rawdata.toString());
    return container;
}

function updateFile(container: User[] | Workspace[] | Channel[] | Message[], filePath: string) {
    let data = JSON.stringify(container, null, 2);
    fs.writeFileSync(filePath, data);
}

router.get('/', reloadFile, getChannelName);
router.get("/messages", reloadFile, getAllMessages);
router.get("/users", reloadFile, getAllUsers);
router.get("/users/user", reloadFile, getUserName);

router.post("/messages", reloadFile, body("body.content").isEmpty(), errorsHandler, createMessage);
router.post("/messages/replies", reloadFile, replyMessage);
router.put("/add", reloadFile, addToChannel);

router.delete("/leave", reloadFile, leaveChannel);
router.delete("/messages", reloadFile, deleteMessage)

export default router;