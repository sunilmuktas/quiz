import {isTokenValid} from './interceptor';
import { registerUser , verifyOtp } from '../controller/signUp'
import { loginUser ,verifyLogin , resendOtp } from '../controller/login'


router.post('/service/user/registration',isTokenValid,registerUser)
router.post('/service/user/activateAccount',verifyOtp)
router.post('/service/user/login',loginUser)
router.post('/service/user/verifyLogin',verifyLogin)
router.post('/service/user/resendOtp',resendOtp)

module.exports = router;