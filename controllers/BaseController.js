class BaseController {
    constructor(){
        //
    }

    responseSuccess(message, result){
        return {
            status:"success",
            message: message,
            data: result
        }
    }

    responseFailed(message, error){
        return {
            status:"error",
            message: message,
            error: error
        }
    }
}

module.exports = BaseController;