class BaseController {

    responseSuccess(message, result){
        return {
            status:"success",
            message: message,
            data: result
        }
    }

    responseFailed(message){
        return {
            status:"error",
            message: message,
        }
    }
}

module.exports = BaseController;