import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CheckoutService } from '../checkout/checkout.service';
import { StripeService } from 'src/commen/service/stripe.service';

@ApiTags('Payment Webhooks')
@Controller({ path: 'payment', version: '1' })
export class PaymentController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly stripeService: StripeService,
  ) {}

  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description: 'Handle Stripe webhook events for payment status updates.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid webhook signature or payload',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Webhook processing failed',
  })
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      // Verify webhook signature and construct event
      const event = this.stripeService.constructWebhookEvent(
        request.rawBody || Buffer.from(''),
        signature,
      );

      // Extract relevant data from the event
      let paymentToken: string;
      let metadata: any = {};

      switch (event.type) {
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
          const paymentIntent = event.data.object as any;
          paymentToken = paymentIntent.id;
          metadata = {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            payment_method: paymentIntent.payment_method,
            client_secret: paymentIntent.client_secret,
            ...paymentIntent.metadata,
          };
          break;

        case 'charge.succeeded':
        case 'charge.failed':
          const charge = event.data.object as any;
          paymentToken = charge.payment_intent;
          metadata = {
            id: charge.id,
            transaction_id: charge.id,
            status: charge.status,
            amount: charge.amount,
            currency: charge.currency,
            payment_method: charge.payment_method_details?.type,
            failure_reason: charge.failure_reason,
            outcome: charge.outcome,
            ...charge.metadata,
          };
          break;

        default:
          // Ignore unhandled event types
          return { received: true, message: `Unhandled event type: ${event.type}` };
      }

      // Process the webhook through checkout service
      const result = await this.checkoutService.handlePaymentWebhook(
        'stripe',
        event.type,
        paymentToken,
        metadata,
      );

      return {
        received: true,
        ...result,
      };

    } catch (error) {
      if (error.message?.includes('Invalid signature')) {
        throw new BadRequestException('Invalid webhook signature');
      }
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  @ApiOperation({
    summary: 'Paymob webhook endpoint',
    description: 'Handle Paymob webhook events for payment status updates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid webhook payload',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Webhook processing failed',
  })
  @Post('webhook/paymob')
  @HttpCode(HttpStatus.OK)
  async handlePaymobWebhook(@Body() payload: any) {
    try {
      // TODO: Implement Paymob webhook verification
      // For now, we'll extract basic information from the payload
      
      const eventType = payload.type || 'transaction_processed';
      const paymentToken = payload.obj?.payment_key_claims?.integration_id || payload.obj?.id;
      const metadata = {
        transaction_id: payload.obj?.id,
        status: payload.obj?.success ? 'succeeded' : 'failed',
        amount: payload.obj?.amount_cents,
        currency: payload.obj?.currency,
        payment_method: payload.obj?.source_data?.type,
        ...payload.obj,
      };

      const result = await this.checkoutService.handlePaymentWebhook(
        'paymob',
        eventType,
        paymentToken,
        metadata,
      );

      return {
        received: true,
        ...result,
      };

    } catch (error) {
      throw new BadRequestException(`Paymob webhook processing failed: ${error.message}`);
    }
  }

  @ApiOperation({
    summary: 'Generic webhook endpoint',
    description: 'Handle generic payment gateway webhook events.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid webhook payload',
  })
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleGenericWebhook(
    @Body() payload: any,
    @Headers('x-gateway') gateway?: string,
  ) {
    try {
      const paymentGateway = gateway || payload.gateway || 'unknown';
      const eventType = payload.event_type || payload.type || 'payment_update';
      const paymentToken = payload.payment_token || payload.payment_id || payload.id;
      
      const result = await this.checkoutService.handlePaymentWebhook(
        paymentGateway,
        eventType,
        paymentToken,
        payload,
      );

      return {
        received: true,
        ...result,
      };

    } catch (error) {
      throw new BadRequestException(`Generic webhook processing failed: ${error.message}`);
    }
  }
}