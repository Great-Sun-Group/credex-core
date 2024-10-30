import { OfferCredexController } from '../api/Credex/controllers/offerCredex';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

async function createSecuredCredexes(count: number, accountId: string) {
    const mockReq = {
        body: {
            memberID: uuidv4(), // Generate a random UUID for memberID
            issuerAccountID: accountId,
            receiverAccountID: uuidv4(), // Generate a random UUID for receiverAccountID
            Denomination: 'ZWG',
            InitialAmount: 100, // You may want to randomize this
            credexType: 'FLOATING',
            OFFERSorREQUESTS: 'OFFERS',
            securedCredex: true,
            dueDate: null // Secured credexes don't have a due date
        },
        id: 'test-request-id'
    } as express.Request;

    const mockRes = {
        status: (code: number) => ({
            json: (data: any) => console.log(`Status ${code}:`, JSON.stringify(data, null, 2))
        })
    } as express.Response;

    for (let i = 0; i < count; i++) {
        console.log(`Creating secured credex ${i + 1} of ${count}`);
        await OfferCredexController(mockReq, mockRes);
    }
}

// Call the function with the desired count and account ID
createSecuredCredexes(50, '263719624032')
    .then(() => console.log('Finished creating secured credexes'))
    .catch(error => console.error('Error creating secured credexes:', error));