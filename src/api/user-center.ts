import request from '@/utils/request'
import type { UserCenterDetail, UserCenterPageResult, UserCenterQuery } from '@/types/user-center'

export function fetchUserCenterUsers(params: UserCenterQuery) {
  return request.get('/admin/users', { params }).then((data) => data as unknown as UserCenterPageResult)
}

export function fetchUserCenterUserDetail(userId: number) {
  return request.get(`/admin/users/${userId}`).then((data) => data as unknown as UserCenterDetail)
}
