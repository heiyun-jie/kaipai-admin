import request from '@/utils/request'
import type {
  PaymentOrderDetail,
  PaymentOrderPageResult,
  PaymentOrderQuery,
} from '@/types/payment'

export function fetchPaymentOrders(params: PaymentOrderQuery) {
  return request.get('/admin/payment/orders', { params }).then((data) => data as unknown as PaymentOrderPageResult)
}

export function fetchPaymentOrderDetail(id: number) {
  return request.get(`/admin/payment/orders/${id}`).then((data) => data as unknown as PaymentOrderDetail)
}
