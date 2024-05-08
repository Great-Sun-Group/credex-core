/* 
The member controler is supposed to handle HTTP transport logic alone. This is what the seperation of concerns principle entails. SINGLE RESPONSIBILITY

Example...

import express from "express";

export function CreateMemberController(
    req: express.Request,
    res: express.Response
){
    // Call the service function that creates a member.
    CreateMemberService(trq.body)
    return res.json({...}).satatus(200)
}
*/
