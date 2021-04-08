import { Router, Request, Response, NextFunction } from 'express';
import bodyparser from 'body-parser';
import { User } from '../interfaces/user';
import { Workspace } from '../interfaces/workspace';
import { Channel } from '../interfaces/channel';
import UIDGenerator from 'uid-generator';
import { body, validationResult } from 'express-validator';
import fs from 'fs';
import { Message } from '../interfaces/message';

let router = Router();
router.use(bodyparser.json());
router.use(bodyparser.urlencoded({extended: true}));

const uidgen = new UIDGenerator();

const usersPath = process.cwd() + '/resources/users.json';
const workspacesPath = process.cwd() + '/resources/workspaces.json';
const channelsPath = process.cwd() + '/resources/channels.json';
const messagesPath = process.cwd() + '/resources/messages.json'
let usersReadByFile:User[] = [];
let workspacesReadByFile:Workspace[] = [];
let channelsReadByFile:Channel[] = [];
let messagesReadByFile:Message[] = []



var errorsHandler = (req:Request, res:Response, next:NextFunction) => {
    var errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }
    next();
}

let checkToken = ({headers:{tkn}}:Request, res:Response,next:NextFunction)=>{
    let user = usersReadByFile.find(user => user.token === tkn);
    if(!user){
        return res.status(400).json({message:"invalid token"})
    }
    next();
}

let reloadFile = (_:Request, __:Response, next:NextFunction) => {
    usersReadByFile = readFile(usersPath) as User[];
    workspacesReadByFile = readFile(workspacesPath) as Workspace[];
    channelsReadByFile = readFile(channelsPath) as Channel[];
    messagesReadByFile = readFile(messagesPath) as Message[];
    next();
}

let getWorkspaceName = ({headers: {workspace_id}}:Request, res:Response) => {
    let workspace = workspacesReadByFile.find(item => item.id === workspace_id) as Workspace;
    if(workspace) {
        res.status(200).json({name: workspace.name})
    }else{
        res.status(404).json({message:"Workspace not found"})
    }
}

let createChannel = ({headers: {workspace_id, tkn}, body: {channelName, privacy}}:Request, res:Response) => {
    let privac = privacy as boolean
    let user = usersReadByFile.find(user => user.token === tkn);
    let chn_id = uidgen.generateSync();
    let channel:Channel = {id: chn_id, name: channelName, private: privac, usersList: [], messagesList: []};
    let workspace = workspacesReadByFile.find(({id}) => id === workspace_id);
    if(privac){
        channel.usersList.push(String(user!.email));
    }else{
        workspace?.usersList.forEach(user => channel.usersList.push(user));
    }
    
    workspace!.channelsList.push(channel.id);
    updateFile(workspacesReadByFile, workspacesPath);
    channelsReadByFile.push(channel);
    updateFile(channelsReadByFile, channelsPath);
    res.status(200).json({message: "Channel created.", channelId: chn_id});
}

//Quando cancello il channel i messaggi scritti su di esso rimangono
//Mettere uno splice per i messaggi del canale
let deleteChannel = ({headers:{workspace_id, channel_id}}:Request, res:Response) => {
    let workspace=workspacesReadByFile.find(item => item.id === workspace_id);
    let channelToDelete = workspace!.channelsList.find(channel=>channel===channel_id) as string;
    workspace?.channelsList.splice(workspace.channelsList.indexOf(channelToDelete), 1);
    let channel = channelsReadByFile.find(channel => channel.id === channelToDelete) as Channel;
    if(channel){
        if(channel.messagesList.length > 0){
            channel.messagesList.forEach(message_id => {
                let messageToDelete = messagesReadByFile.find(message => message.id === message_id) as Message;
                if(messageToDelete){
                    let indexMessageToDelete = messagesReadByFile.indexOf(messageToDelete);
                    messagesReadByFile.splice(indexMessageToDelete, 1)
                }
            })
            updateFile(messagesReadByFile, messagesPath)
        }
    }
    let indexToDelete = channelsReadByFile.indexOf(channel);
    if(indexToDelete == -1) return res.status(404).json({message:"channel not found"});
    channelsReadByFile.splice(indexToDelete,1);

    updateFile(channelsReadByFile, channelsPath);
    updateFile(workspacesReadByFile, workspacesPath);
    res.status(200).json({message:"canale eliminato"})
}

let getChannels = ({headers:{workspace_id}}:Request, res:Response)=>{
    let channels: {id:string, name:string}[] = [];
    let workspace=workspacesReadByFile.find(item => item.id === workspace_id);
    workspace!.channelsList!.forEach(channelId => channelsReadByFile.find((channel) => {
            channel.id === channelId && channels.push({id: channel.id, name: channel.name})
        })
    );
    res.status(200).json(channels);
}

let getUsers = ({headers: {workspace_id}}:Request, res:Response) => {
    let users:{email:string, username:string}[] = [];
    let workspace = workspacesReadByFile.find(workspace => workspace.id === workspace_id);
    workspace && (workspace.usersList.forEach((email) => {
        let user = usersReadByFile.find(user => user.email === email);
        user && (users.push({email: user.email, username: user.username}));
    }));
    res.status(200).json(users);
}

let leaveWorkspace = ({headers: {tkn,workspace_id}}:Request, res:Response) => {
    let user = usersReadByFile.find(user => user.token === tkn);
    let workspace = user!.workspacesList?.find(workspaceId => workspaceId === workspace_id);
    if(workspace){
        user!.workspacesList?.splice(user!.workspacesList.indexOf(String(workspace_id)), 1);
        updateFile(usersReadByFile, usersPath);
        let workspaceFromFile=workspacesReadByFile!.find(({id})=> id === workspace_id);
        let userInWorkspace = workspaceFromFile?.usersList.find(email => email === user!.email);
        if(userInWorkspace){
            workspaceFromFile?.channelsList.forEach((channelId) => {
                let chn = channelsReadByFile.find(channel => channel.id === channelId);
                if(chn?.usersList.includes(user?.email as string)){
                    let userIndex = chn.usersList.indexOf(user?.email as string);
                    userIndex && chn.usersList.splice(userIndex, 1);
                }
            })
            updateFile(channelsReadByFile, channelsPath);
            workspaceFromFile?.usersList.splice(workspaceFromFile.usersList.indexOf(user!.email),1);
            updateFile(workspacesReadByFile,workspacesPath);
            res.status(200).json({message: "Workspace left."});
        }else{
            res.status(400).json({message: "User not found in this workspace!"});
        }
    }else{
        res.status(404).json({message: "Workspace not found."});
    }
}

let deleteWorkspace = ({headers:{workspace_id}}:Request, res:Response) => {
    let workspace = workspacesReadByFile.find(workspace => workspace.id === workspace_id);
    let indexWorkspaceToDelete = workspacesReadByFile.indexOf(workspace as Workspace);
    workspacesReadByFile.splice(indexWorkspaceToDelete, 1);

    workspace?.usersList.forEach(email => {
        let user = usersReadByFile.find(user => user.email === email);
        let indexToDelete = user?.workspacesList.indexOf(workspace_id as string) as number;
        user?.workspacesList.splice(indexToDelete, 1)
    })

    workspace?.channelsList.forEach(channelId => {
        let channel = channelsReadByFile.find(channel => channel.id === channelId);
        let indexToDelete = channelsReadByFile.indexOf(channel as Channel);
        channelsReadByFile.splice(indexToDelete, 1)
    })
    
    updateFile(workspacesReadByFile, workspacesPath);
    updateFile(usersReadByFile, usersPath);
    updateFile(channelsReadByFile, channelsPath);
    res.status(200).json({message: "Workspace deleted"})
}

function readFile(filePath:string)  {
    let rawdata = fs.readFileSync(filePath);
    let container = JSON.parse(rawdata.toString());
    return container;
}

function updateFile(container: User[] | Workspace[] | Channel[] | Message[], filePath:string){
    let data = JSON.stringify(container, null, 2);
    fs.writeFileSync(filePath, data);
}

router.get('/', reloadFile, getWorkspaceName);
router.get('/channels', reloadFile, getChannels);
router.get('/users', reloadFile, getUsers);

router.post('/channels', reloadFile, checkToken, body("body.channelName").isEmpty(), errorsHandler, createChannel);

router.delete('/leave', reloadFile, checkToken, leaveWorkspace);
router.delete('/channels', reloadFile, checkToken, deleteChannel);
router.delete('/', reloadFile, checkToken, deleteWorkspace);

export default router;