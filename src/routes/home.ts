import { Router, Request, Response, NextFunction, request } from 'express';
import bodyparser from 'body-parser';
import { User } from '../interfaces/user';
import { Workspace } from '../interfaces/workspace';
import { Channel } from '../interfaces/channel';
import UIDGenerator from 'uid-generator';
import { body, validationResult } from 'express-validator';
import fs from 'fs';

let router = Router();
router.use(bodyparser.json());
router.use(bodyparser.urlencoded({extended: true}));

const uidgen = new UIDGenerator();

const usersPath = process.cwd() + '/resources/users.json';
const workspacesPath = process.cwd() + '/resources/workspaces.json';
const channelsPath = process.cwd() + '/resources/channels.json';
let usersReadByFile:User[] = [];
let workspacesReadByFile:Workspace[] = [];
let channelsReadByFile:Channel[] = [];

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
    next();
} 

let enterWorkspace = ({headers: {tkn}, body: {id}}:Request, res:Response) => {//le get possono avere body?? StackOverflow dice di si
    //nel service nn posso passare un body credo //Come lo avevamo fatto su angular? Perchè l'api non l'ho cambiata
    //io mi ricordavo sta cosa, cmq mi pareva nn si potessero mettere, casomai vediamo dopo
    //stavo guardando i service che abbiamo fatto la scorsa volta e non abbiamo il servizio di enter 
    //Questa API potrebbe essere inutile
    let user = usersReadByFile.find(user => user.token === tkn);
    let workspace = workspacesReadByFile.find(workspace => workspace.id === id);
    !workspace && res.status(404).json({message: "A workspace with this id doesn't exist!"});
    workspace?.usersList.find(email => email === user!.email) && res.status(200).json(workspace.id) ||
    res.status(404).json({message: "User not found in this workspace!"});
}

let createWorkspace = ({headers: {tkn}, body: {name}}:Request, res:Response) => {
    let user = usersReadByFile.find(user => user.token === tkn);
    let defaultChannels:Channel[]=[
        {id:uidgen.generateSync(),name:"Random", private: false,usersList:[user!.email], messagesList: []},
        {id:uidgen.generateSync(),name:"General", private: false,usersList:[user!.email], messagesList: []}
    ];
    let newWorkspace:Workspace={
        id:uidgen.generateSync(),
        name,
        channelsList:[defaultChannels[0].id, defaultChannels[1].id],
        usersList:[user!.email]
    }

    user?.workspacesList.push(newWorkspace.id);
    updateFile(usersReadByFile, usersPath);
    workspacesReadByFile.push(newWorkspace);
    updateFile(workspacesReadByFile, workspacesPath);
    channelsReadByFile.push(defaultChannels[0]);
    channelsReadByFile.push(defaultChannels[1]);
    updateFile(channelsReadByFile, channelsPath);
    res.status(200).json({message:`Workspace ${name} created!`,workspaceId:newWorkspace.id})
}

let joinWorkspace = ({headers: {tkn, workspace_id}}:Request, res:Response) => {
    let user = usersReadByFile.find(user => user.token === tkn);
    let workspace = workspacesReadByFile.find(workspace => workspace.id === workspace_id);
    if(!workspace){
        return res.status(404).json({message: "This workspace doesn't exist"});
    }
    if(workspace!.usersList.find(item => item === user!.email)) {
        return res.status(400).json({message: "This user's is already in this workspace!"});
    }
    workspace && user!.workspacesList!.push(String(workspace_id));
    workspacesReadByFile.find(item => item.id === workspace_id)!.usersList.push(user!.email);
    workspace?.channelsList.forEach(channelId => channelsReadByFile.find(channel => {
        (channel.id === channelId && channel.private == false) && channel.usersList.push(user?.email as string);
    }));
    updateFile(usersReadByFile, usersPath)
    updateFile(workspacesReadByFile, workspacesPath);
    updateFile(channelsReadByFile, channelsPath);
    res.status(200).json({message: "Workspace added"});
}

let AllWorkspaces = ({headers: {tkn}}:Request, res:Response) => {
    let user = usersReadByFile.find((user) => user.token === tkn);
    let userWorkspacesName: {id:string, name:string}[] = [];
    user!.workspacesList!.forEach(workspaceId => workspacesReadByFile.find(item => {item.id === workspaceId && userWorkspacesName.push({id:item.id, name: item.name})}));
    res.status(200).json(userWorkspacesName);
}

function readFile(filePath:string)  {
    let rawdata = fs.readFileSync(filePath);
    let container = JSON.parse(rawdata.toString());
    return container;
}

function updateFile(container: User[] | Workspace[] | Channel[], filePath:string){
    let data = JSON.stringify(container, null, 2);
    fs.writeFileSync(filePath, data);
}

router.get('/workspaces', reloadFile, checkToken,AllWorkspaces);
router.get('/enter/workspace', reloadFile, checkToken,body("body.id").isEmpty(), errorsHandler, enterWorkspace);

router.post('/workspace',reloadFile, checkToken,body("body.name").isEmpty(), errorsHandler,createWorkspace);
router.post('/join/workspace',reloadFile, checkToken,joinWorkspace);


export default router;