import express, {Router, Request, Response, NextFunction, request} from 'express';
import fs from 'fs';
import bodyparser from 'body-parser';
import UIDGenerator from 'uid-generator';
import { body, validationResult } from 'express-validator';

import { User } from '../interfaces/user';
import { Workspace } from '../interfaces/workspace';
import { Channel } from '../interfaces/channel';

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

usersReadByFile = readFile(usersPath) as User[];
workspacesReadByFile = readFile(workspacesPath) as Workspace[];
channelsReadByFile = readFile(channelsPath) as Channel[];


let errorHandler = (req:Request, res:Response, next:NextFunction) => {
    let errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json(errors.array);
    }
    next();
}
//TOLTO REDIS, UTENTI SCRITTI SU FILE
//GLI UTENTI HANNO UN TOKEN CHE INIZIALMENTE E' VUOTO
//QUANDO L'UTENTE LOGGA GLIENE VIENE DATO UNO
//SE L'UTENTE NE AVEVA GIA' UNO, QUANDO RILOGGA VIENE SOVRASCRITTO
let register = ({body: {username, email, password}}:Request, res:Response) => {
    let user = usersReadByFile.find(user => user.email === email);
    if(!user){
        usersReadByFile.push({token: '', email, username, password, workspacesList: []});
        updateFile(usersReadByFile, usersPath);
        res.status(200).json({message: `User ${username} registered`});
    }else{
        res.status(400).json({message: `This email is already in use.`});
    }
}

let login = ({headers: {email, password}}:Request, res:Response) => {
    let user = usersReadByFile.find(user => user.email === email);
    if(user){
        if(password === user.password){
            let token = uidgen.generateSync();
            user.token = token;
            updateFile(usersReadByFile, usersPath);
            res.status(200).json({token, username: user.username});
        }else{
            res.status(400).json({message: "Incorrect password!"});
        }
    }else{
        res.status(404).json({message: "User not found!"});
    }
}

let logout = ({headers: {tkn}}:Request, res:Response)=> {
    console.log("TOKEN LOGOUT", tkn)
    let user = usersReadByFile.find(user => user.token === tkn);
    user && (user.token = '', updateFile(usersReadByFile, usersPath), res.status(200).json({message: "Succesfully logged out!"})) ||
    res.status(418).json({message: `No user logged in associated with this token.`});
}

let deleteAccount = ({headers: {email}}:Request, res:Response) => {
    let user = usersReadByFile.find(user => user.email === email);
    if(user){
        let userToRemove = usersReadByFile.indexOf(user);
        usersReadByFile.splice(userToRemove, 1);
        updateFile(usersReadByFile, usersPath);

        (workspacesReadByFile.forEach(workspace => 
            workspace.usersList.find((email) => {email === user!.email && 
                workspace.usersList.splice(workspace.usersList.indexOf(email), 1)})));
        updateFile(workspacesReadByFile, workspacesPath);

        (channelsReadByFile.forEach(channel => 
            channel.usersList.find((email) => {email === user!.email && 
                channel.usersList.splice(channel.usersList.indexOf(email), 1)})));
        updateFile(channelsReadByFile, channelsPath);
        res.status(200).json({message: "User deleted."})
    }else{
        res.status(404).json({message: "Invalid email."});
    }
}

let getEmail = ({headers: {tkn}}:Request, res:Response) => {
    let user = usersReadByFile.find(user => user.token === tkn);
    user && res.status(200).json(user.email) || 
    res.status(404).json({message: "This token is not associated to any email."});
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


router.get('/users', (_, res:Response) => res.status(200).json(usersReadByFile));
router.get('/email', getEmail);

router.post('/login', login);
router.post('/register', body('user.email').isEmpty(), 
            body('user.username').isEmpty(), body('user.password').isEmpty(), 
            errorHandler, register);

router.delete('/logout', logout);
router.delete('/user',deleteAccount);

export default router;