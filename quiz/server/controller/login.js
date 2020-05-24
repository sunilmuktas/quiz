"use strict";
import { DbConnMgr } from '../dbconfig/dbconfig';
import { TokenModel } from '../model/tokenManager';
import { Utils } from '../utility/utils';
import {Messages} from '../utility/message'
import {UserModel} from '../model/login'
import { OtpModel } from '../model/otp';
import { UserModel as RegisterModel} from '../model/signUp';

const tokenModel = new TokenModel();
let db = DbConnMgr.getInstance();
let util = new Utils();
let loginModel = new UserModel();
let registerModel = new RegisterModel();
let authKey = 'aa1413af-9cb2-11ea-9fa5-0200cd936042'
const TwoFactor = new (require('2factor'))(authKey);
let otpModel = new OtpModel();
let token = uuidv1() + Math.floor(new Date() / 1000);
const STATUS = {
    SUCCESS: 0,
    FAILURE: 1
  }

  export class USERLOGIN {
    constructor(userdata) {
  this.mobile = userdata.mobile;
    this.deviceInfo={
        'device_type':userdata.device_type,
        'device_name':userdata.device_name,
        'device_model':userdata.device_model,
        'os_version':userdata.os_version,
        'device_token':'',
        'ip_address':userdata.ip_address,
        'app_version':userdata.app_version,
        'created_on' : util.getCurrentTimeStamp()
    }
    this.created_on= util.getCurrentTimeStamp();
    }
  }


  export const loginUser = (request,response)=>{
    __userLogin(request, response).then(loginRes => {
        return loginRes;
      })
  }


  const __userLogin = async (request,response)=> {
    let loginData = new USERLOGIN(request.body);
    let isUserExists = await loginModel.isUserExists(loginData.mobile)
    console.log(isUserExists)
    if(isUserExists[0]){
        let otp = await __getOtp();
        let userId = isUserExists[0].userId;
        const otpRes=await TwoFactor.sendOTP(loginData.mobile, {otp: otp, template: 'otp'}).then((res) => {
        
         return STATUS.SUCCESS;
         }, (err) => {
           return err
         })
         await otpModel.updateOtp(otp, loginData.created_on, loginData.mobile)
         if(otpRes==STATUS.SUCCESS){
            let saveToken = await tokenModel.saveLoginToken(userId, token);
            loginData.deviceInfo.device_token=token;
            await registerModel.insertDeviceInfo(loginData.deviceInfo,userId);
            response.send(ResponseHelper.buildSuccessResponse({},'Please Verify OTP Sent to registered Mobile Number.', STATUS.SUCCESS));
         }
         else{
            response.send(ResponseHelper.buildSuccessResponse(otpRes,'Error sending OTP.', STATUS.FAILURE));  
         }
    }
    else{
        response.send(ResponseHelper.buildSuccessResponse({}, Messages.login.UserNotExists, STATUS.FAILURE));
    }
    
  }


  export const verifyLogin = (request,response)=>{
    __verifyLogin(request, response).then(loginRes => {
        return loginRes;
      })
  }



  const __verifyLogin = async (request,response)=>{
let otp= request.body.otp;
let emailOrMobile = request.body.emailOrMobile;
try {
    let isExpired = await otpModel.isExpired(emailOrMobile);
    if (isExpired.length > 0) {

      let cuurentTime = Date.now(); //current time in miliseconds
      let otpCreatedTime = Date.parse(isExpired[0].created_on); //otp timestamp in millisecond
      let diffMili = cuurentTime - otpCreatedTime;
      let diffSec = diffMili / 1000;
      let diffmin = Math.floor(diffSec / 60); // Converting difference milisecond in minute

      if (isExpired[0].isVerified) {
        if(diffmin > 30){
          let expOtp = await otpModel.doExpireOtp(emailOrMobile);
          return response.send(ResponseHelper.buildSuccessResponse({}, 'Your OTP expired,Please Request New OTP', STATUS.FAILURE));
        }
        else{
          let ResObj = await registerModel.getUserDetails(emailOrMobile);
          return response.send(ResponseHelper.buildSuccessResponse(ResObj, 'OTP Already Verified ', STATUS.FAILURE));
        }
        
      } else if (diffmin > 5) {
        let expOtp = await otpModel.doExpireOtp(emailOrMobile);
        return response.send(ResponseHelper.buildSuccessResponse({}, 'Your OTP expired,Please Request New OTP', STATUS.FAILURE));
      } else {
        if (otp == isExpired[0].otp) {
           await otpModel.verifyOtp(util.getCurrentTimeStamp(), emailOrMobile);
           await registerModel.activeAccount(emailOrMobile);
          let ResObj = await registerModel.getUserDetails(emailOrMobile);

          return response.send(ResponseHelper.buildSuccessResponse(ResObj, 'OTP Successfully Verified', STATUS.SUCCESS));
        } else {
          return response.send(ResponseHelper.buildSuccessResponse({}, 'Please Enter Correct OTP', STATUS.FAILURE));
        }
      }
    } else {
      return response.send(ResponseHelper.buildSuccessResponse({}, 'Please Enter Correct Email or Mobile', STATUS.FAILURE));
    }
  }
  catch (err) {
    console.log(err);
    return response.send(new Error('OTP verification Fail'));
  }

  }




  export const resendOtp = (request,response)=>{
    __resendOtp(request, response).then(loginRes => {
        return loginRes;
      })
  }


  const __resendOtp = async (request,response)=>{
      
      let loginData = new USERLOGIN(request.body);
    let isUserExists = await loginModel.isUserExists(loginData.mobile)
    console.log(isUserExists)
    if(isUserExists[0]){
        let otp = await __getOtp();
        let userId = isUserExists[0].userId;
        const otpRes=await TwoFactor.sendOTP(loginData.mobile, {otp: otp, template: 'otp'}).then((res) => {
        
         return STATUS.SUCCESS;
         }, (err) => {
           return err
         })
         await otpModel.updateOtp(otp, loginData.created_on, loginData.mobile)
         if(otpRes==STATUS.SUCCESS){
            let saveToken = await tokenModel.saveLoginToken(userId, token);
            loginData.deviceInfo.device_token=token;
            await registerModel.insertDeviceInfo(loginData.deviceInfo,userId);
            response.send(ResponseHelper.buildSuccessResponse({},'Please Verify OTP Sent to registered Mobile Number.', STATUS.SUCCESS));
         }
         else{
            response.send(ResponseHelper.buildSuccessResponse(otpRes,'Error sending OTP.', STATUS.FAILURE));  
         }
    }
    else{
        response.send(ResponseHelper.buildSuccessResponse({}, Messages.login.UserNotExists, STATUS.FAILURE));
    }
  }


  const  __getOtp = () => {
    let digit = '0123456789';
    let otp = '';
  
    for (let i = 0; i < 6; i++) {
      otp += digit[Math.floor(Math.random() * 10)];
    }
    return otp;
  }