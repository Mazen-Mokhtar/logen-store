const generateMessage = (entity) => {
  return {
    notFound: `${entity} Not Found`,
    alreadyExist: `${entity} Already Exist`,
    createdSuccessfully: `${entity} Created Successfully`,
    updatedSuccessfully: `${entity} Updated Successfully`,
    deletedSuccessfully: `${entity} Deleted Successfully`,
    failToCreate: `Fail To Create ${entity}`,
    failToUpdate: `Fail To Update ${entity}`,
    failToDelete: `Fail To Delete ${entity}`,
  };
};
export const messageSystem = {
  user: {
    ...generateMessage('User'),
    incorrectPassword: 'Incorrect Password ',
    emailActive: 'Email Created but Ative Your Email From Message Gmail First',
    emailIsActived: 'Email is active you con login now',
    invalid: 'Invalid User',
    login: 'Login Successfully',
    yourProfile: 'Your Profile',
    token: 'Invalid Token',
    resetCode: 'Sended Your Code In Gmail Message',
    expiredCode: 'Invalid or expired reset token',
    notAuthorized: 'Not Authorized',
    authorization: 'Authorization Is Required',
    isAlreadyDeleted: 'User Is Already Deleted',
    freezeAcc: 'User Is Freezed In 60 Days Login To Return The Account ',
    signupfirst: 'Sigup Frist',
    dontHaveBlockListYet: 'Dont Have block list yet',
  },
  order: {
    ...generateMessage('Order'),
    invalid: 'Invalid Order',
    notFound: 'Order not found',
    paymentFailed: 'Payment failed',
    alreadyPaid: 'Order is already paid',
  },
  coupon: {
    ...generateMessage('Coupon'),
    invalid: 'Invalid Coupon',
    expired: 'Coupon has expired',
    notFound: 'Coupon not found',
  },
  
};
